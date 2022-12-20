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
import { useAuth } from "../../firebase/authContext";
import { createItemData } from "../../firebase/factory";
import { useItems } from "../../firebase/itemsContext";
import { itemsOfList, itemsOfSection } from "../../firebase/useDb";
import { Item as ItemType, Section, AdminList } from "../../types/types";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { Item } from "./Item";
import { ItemArea } from "./ItemArea";

// TODO
// DONE - moved to context!
// - use setLocalItems to add temporary item to localItems (with doc()?)
// - maintain that temporary item through localItem updates
// - create function that creates temp item in localItems, sets focus, & puts
// in edit mode
// - create function that changes order of all subsequent items in localItems

const ItemDndContext = ({ list }: { list: AdminList }) => {
  const { user } = useAuth();
  const { items, sections, localItems, setLocalItems, loading, error } =
    useItems();
  const [activeItem, setActiveItem] = useState<ItemType | null>();

  // useEffect(() => {
  //   if (activeItem)
  //     console.log("picked up: ", activeItem.data.name, activeItem.ref.id);
  // }, [activeItem]);

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
      // // all items in the container the active item is from
      // const activeItems = prev[activeContainer.ref.id]!;
      // // all items in the container the active item is over
      // const overItems = prev[overContainer.ref.id]!;

      // // Find the indexes for the actively dragged item and the item we're dragging over
      // const activeIndex = activeItems
      //   ?.map((item) => item.ref.id)
      //   .indexOf(active.data.current?.item.ref.id);
      // const overIndex = overItems
      //   ?.map((item) => item.ref.id)
      //   .indexOf(over.data.current?.item.ref.id);
      // // console.log("overIndex: ", overIndex);

      // let newIndex;
      // // check if we're over a container (header or empty area) and not an item
      // if (over.id in prev) {
      //   console.log("over a container");
      //   // then put item at the end of the container
      //   // TODO: should this really be +1 or should index start with 0?
      //   newIndex = overItems.length + 1;
      // } else {
      //   const isBelowLastItem =
      //     over &&
      //     overIndex === overItems.length - 1 &&
      //     // if the current pointer position is below the last item
      //     active.rect.current.translated!.top >
      //       over.rect.top + over.rect.height;

      //   if (isBelowLastItem) console.log("below last item");
      //   const modifier = isBelowLastItem ? 1 : 0;

      //   newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      //   console.log("overIndex: ", overIndex);
      //   console.log("newIndex: ", newIndex);
      // }

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

  // TODO: where to change order property of items? Reuse code from handleDragOver?
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const overItem = over?.data.current?.item;
    console.log("activeItem id: ", active.data.current?.item.ref.id);
    console.log("overItem id: ", over?.data.current?.item.ref.id);
    const activeContainer = findContainer(activeItem?.ref.parent.parent?.id)!;
    const overContainer = findContainer(over?.id);
    console.log("activeContainer: ", activeContainer.ref.id);
    console.log("overContainer: ", overContainer?.ref.id);

    if (
      items &&
      activeContainer &&
      overContainer &&
      activeItem &&
      overItem &&
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

      // find index of item we're dropping on
      // TODO: potentially reuse code from handleDragOver to check for
      // isBelowLastItem
      // // check if we're over a container (header or empty area) and not an item
      // if (over.id in prev) {
      //   console.log("over a container");
      //   // then put item at the end of the container
      //   // TODO: should this really be +1 or should index start with 0?
      //   newIndex = overItems.length + 1;
      // } else {
      //   const isBelowLastItem =
      //     over &&
      //     overIndex === overItems.length - 1 &&
      //     // if the current pointer position is below the last item
      //     active.rect.current.translated!.top >
      //       over.rect.top + over.rect.height;

      //   if (isBelowLastItem) console.log("below last item");
      //   const modifier = isBelowLastItem ? 1 : 0;

      //   newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      //   console.log("overIndex: ", overIndex);
      //   console.log("newIndex: ", newIndex);

      let newIndex;
      // check if we're over a container (header or empty area) and not an item
      if (over.id in localItems) {
        console.log("over a container");
        // then put item at the end of the container
        newIndex = localItems[overContainer.ref.id].length;
      } else {
        // find index of item we're dropping on
        const overIndex = localItems[overContainer.ref.id]
          .map((item) => item.ref.id)
          .indexOf(overItem.ref.id);
        console.log("overItem: ", overItem.data.name);
        // TODO: overItem is the active item itself, when dropping belowLastItem
        // which is not present in the container if we're dropping on a new container
        console.log("overIndex: ", overIndex);

        const isBelowLastItem =
          over &&
          // if we are dropping on the last item
          overIndex === overContainerItems.length &&
          // if the current pointer position is below the last item
          active.rect.current.translated!.top >
            over.rect.top + over.rect.height;

        if (isBelowLastItem) console.log("below last item");
        const modifier = isBelowLastItem ? 1 : 0;

        newIndex = overIndex + modifier;
      }

      // const newIndex = localItems[overContainer.ref.id]!.map(
      //   (item) => item.ref.id
      // ).indexOf(over?.id as string);
      // console.log("newIndex: ", newIndex);
      // console.log(oldIndex, newIndex);

      if (overContainer.ref.id === activeContainer.ref.id) {
        console.log("dropped on same container");
        // create array of item ids in new order & add active item if it's new to container
        const newOverOrder = arrayMove(oldOverOrder, oldOverIndex, newIndex);
        console.log("newOverOrder: ", newOverOrder);

        newOverOrder
          // find all items that between the old and new index of the active item
          .filter((id, index) => index !== oldOverOrder.indexOf(id))
          .forEach((id) => {
            // get ref of item by id:
            const itemObj = overContainerItems.find(
              (item) => item.ref.id === id
            );
            console.log("updating: ", itemObj?.data.name);

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
                name: active.data.current?.item.data.name,
                authorizedUsers: list.data.contributors
                  ? [list.data.ownerID, ...list.data.contributors]
                  : [list.data.ownerID],
                list,
                order: newIndex,
              })
            );
        deleteDoc(activeItem.ref);
        // console.log(
        //   "written moved item to db: ",
        //   active.data.current?.item.data.name
        // );

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

        // TODO: also update order of items in old container if item moved to new container
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
    setActiveItem(e.active.data.current?.item as ItemType);
  };

  return (
    <>
      {error && <Error msg={error.message} />}
      {loading ? (
        <Loading />
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
