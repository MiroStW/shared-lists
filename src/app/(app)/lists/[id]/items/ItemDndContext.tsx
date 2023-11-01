"use client";

import {
  useSensor,
  TouchSensor,
  MouseSensor,
  useSensors,
  UniqueIdentifier,
  DragOverEvent,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  DndContext,
  DragOverlay,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove } from "@dnd-kit/sortable";
import { addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { useItems } from "app/(app)/lists/[id]/itemsContext";
import { Item as ItemType, Section, AdminList } from "types/types";
import { createItemData } from "db/factory";
import { itemsOfList, itemsOfSection } from "db/useDb";
import { Item } from "./Item";
import { ItemArea } from "./ItemArea";
import LoadingItems from "app/shared/LoadingItems";
import { useClientSession } from "app/sessionContext";

const ItemDndContext = ({ list }: { list: AdminList }) => {
  const { user } = useClientSession();
  const { items, sections, localItems, setLocalItems, loading } = useItems();
  const [activeItem, setActiveItem] = useState<ItemType | null>();

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      delay: 120,
      tolerance: 5,
    },
  });

  const sensors = useSensors(touchSensor, mouseSensor);

  const findContainer = (id?: UniqueIdentifier) => {
    // return a dropped on list
    if (list.ref.id === id) return list;

    // returns a dropped on section
    const sectionContainer = sections?.find((section) => id === section.ref.id);
    if (sectionContainer) return sectionContainer;

    // returns a dropped on items current parent area
    // const overItem = localItems?.docs.find((item) => id === item.id)?.data();
    const overItemParentId = Object.keys(localItems).find((ContainerId) =>
      localItems[ContainerId]?.find((item) => item.ref.id === id)
    );
    // console.log("overItemParentId: ", overItemParentId);
    // const overItemParentId = overItem?.ref.parent.parent?.id;
    const overItemParent =
      overItemParentId === list.ref.id
        ? list
        : sections?.find((section) => overItemParentId === section.ref.id);
    if (overItemParent) return overItemParent;

    return undefined;
  };

  // handle moving an item over a different container, before saving to
  // db on drag end
  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over?.id);
    if (
      !activeContainer ||
      !overContainer ||
      !over ||
      activeContainer.ref.id === overContainer.ref.id
    ) {
      return;
    }

    setLocalItems((prev) => {
      return {
        ...prev,
        // remove active item from active container
        [activeContainer.ref.id]: [
          ...prev[activeContainer.ref.id]!.filter(
            (item) => item.ref.id !== activeItem?.ref.id
          ),
        ],
        // add active item to over container at new index
        [overContainer.ref.id]: [...prev[overContainer.ref.id]!, activeItem!],
      };
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const overElement = over?.data.current?.element as
      | AdminList
      | Section
      | ItemType;
    const overType = over?.data.current?.type as "list" | "section" | "item";
    // console.log("activeItem id: ", active.data.current?.element.ref.id);
    // console.log("overElement id: ", over?.data.current?.element.ref.id);

    const activeContainer = findContainer(activeItem?.ref.parent.parent?.id)!;
    const overContainer = findContainer(over?.id);
    // console.log("activeContainer: ", activeContainer.ref.id);
    // console.log("overContainer: ", overContainer?.ref.id);

    if (
      items &&
      activeContainer &&
      overContainer &&
      activeItem &&
      overElement &&
      user
    ) {
      // all items in the dropped on container
      const overContainerItems = items.filter(
        (item) => item.ref.parent.parent?.id === overContainer.ref.id
      );

      // all items in the original container
      const activeContainerItems = items.filter(
        (item) => item.ref.parent.parent?.id === activeContainer.ref.id
      );

      // create array of item ids in current order
      const oldOverOrder = overContainerItems.map((item) => item.ref.id);
      const oldActiveOrder = activeContainerItems.map((item) => item.ref.id);

      // find index of item we're dragging
      const oldOverIndex = oldOverOrder.indexOf(active.id as string);
      const oldActiveIndex = oldActiveOrder.indexOf(active.id as string);

      const newIndex =
        overType === "list" || overType === "section"
          ? // put item at end of container if dropped on container
            localItems[overContainer.ref.id].length
          : // put item at index of dropped on item
            localItems[overContainer.ref.id]
              .map((item) => item.ref.id)
              .indexOf(overElement.ref.id);

      if (overContainer.ref.id === activeContainer.ref.id) {
        // console.log("dropped on same container");
        // create array of item ids in new order & add active item if it's new to container
        const newOverOrder = arrayMove(oldOverOrder, oldOverIndex, newIndex);
        // console.log("newOverOrder: ", newOverOrder);

        newOverOrder
          // find all items that between the old and new index of the active item
          .filter((id, index) => index !== oldOverOrder.indexOf(id))
          .forEach((id) => {
            // get ref of item by id:
            const itemObj = overContainerItems.find(
              (item) => item.ref.id === id
            );
            // console.log("updating: ", itemObj?.data.name);

            if (itemObj) {
              updateDoc(itemObj.ref, "order", newOverOrder.indexOf(id));
            }
          });
      } else {
        const newActiveOrder = oldActiveOrder.filter((id) => id !== active.id);

        const newOverOrder = [
          ...oldOverOrder.slice(0, newIndex),
          activeItem.ref.id,
          ...oldOverOrder.slice(newIndex, oldOverOrder.length),
        ];

        // if item moved to new container, delete it in old & add in new container
        overContainer.ref.parent.id === "lists"
          ? addDoc(
              itemsOfList(overContainer as AdminList),
              createItemData({
                name: activeItem.data.name,
                authorizedUsers: list.data.contributors
                  ? [list.data.ownerID, ...list.data.contributors]
                  : [list.data.ownerID],
                list,
                order: newIndex,
              })
            )
          : addDoc(
              itemsOfSection(overContainer as Section),
              createItemData({
                name: activeItem.data.name,
                authorizedUsers: list.data.contributors
                  ? [list.data.ownerID, ...list.data.contributors]
                  : [list.data.ownerID],
                list,
                order: newIndex,
              })
            );
        deleteDoc(activeItem.ref);

        // check if other items changed order
        newOverOrder
          // find all items that between the old and new index of the active item
          .filter((id, index) => index !== oldOverOrder.indexOf(id))
          .forEach((id) => {
            // get ref of item by id:
            const itemObj = overContainerItems.find(
              (item) => item.ref.id === id
            );

            if (itemObj) {
              updateDoc(itemObj.ref, "order", newOverOrder.indexOf(id));
            }
          });

        // update order of items in old container if item moved to new container
        if (overContainer.ref.id !== activeContainer.ref.id)
          oldActiveOrder
            // find all items below the active item
            .slice(oldActiveIndex + 1)
            .forEach((id) => {
              // get ref of item by id:
              const itemObj = activeContainerItems.find(
                (item) => item.ref.id === id
              );

              if (itemObj) {
                updateDoc(itemObj.ref, "order", newActiveOrder.indexOf(id));
              }
            });
      }

      setActiveItem(null);
    }
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveItem(e.active.data.current?.element as ItemType);
  };

  return (
    <>
      {loading ? (
        <LoadingItems />
      ) : (
        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis]}
          collisionDetection={closestCenter}
          onDragStart={(e) => handleDragStart(e)}
          onDragOver={(e) => handleDragOver(e)}
          onDragEnd={(e) => handleDragEnd(e)}
        >
          <ItemArea list={list} sections={sections} items={localItems} />

          <DragOverlay dropAnimation={null}>
            {activeItem ? (
              <div>
                <Item item={activeItem} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
};

export { ItemDndContext };
