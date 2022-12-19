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
  // TODO: check if allthe sorting is really needed or only on drag end - SEEMS NOT!
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

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const overItem = over?.data.current?.item;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over?.id);

    if (
      items &&
      activeContainer &&
      overContainer &&
      activeItem &&
      overItem &&
      user
    ) {
      const overContainerItems = items.filter(
        (item) => item.ref.parent.parent?.id === overContainer.ref.id
      );

      // establish new order
      const oldItemOrder = overContainerItems.map((item) => item.ref.id);

      const newIndex = localItems[overContainer.ref.id]!.map(
        (item) => item.ref.id
      ).indexOf(over?.id as string);
      const oldIndex = oldItemOrder.indexOf(active.id as string);
      // console.log("newIndex: ", newIndex);
      // console.log(oldIndex, newIndex);

      // newItemOrder based on newIndex & whether item moved to new container
      const newItemOrder = oldItemOrder.includes(activeItem.ref.id)
        ? arrayMove(oldItemOrder, oldIndex, newIndex)
        : [
            ...oldItemOrder.slice(0, newIndex),
            activeItem.ref.id,
            ...oldItemOrder.slice(newIndex, oldItemOrder.length),
          ];

      // if item moved to new container, delete it in old & add in new container
      if (!oldItemOrder.includes(activeItem.ref.id)) {
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
        deleteDoc(active.data.current?.item.ref);
        // console.log(
        //   "written moved item to db: ",
        //   active.data.current?.item.data.name
        // );
      }
      // console.log("old order: ", oldItemOrder);
      // console.log("new order: ", newItemOrder);

      // check if other items changed order
      newItemOrder.forEach((id, index) => {
        if (newItemOrder.indexOf(id) !== oldItemOrder.indexOf(id)) {
          // get ref of item by id:
          const itemObj = overContainerItems.find((item) => item.ref.id === id);

          if (itemObj) {
            updateDoc(itemObj.ref, "order", index);
            // console.log(
            //   "written new order to db for item: ",
            //   itemObj.data.name
            // );
          }
        }
        // check if localItems order is unchanged, but db order differs -> bug?
        else if (
          newItemOrder.indexOf(id) !==
          overContainerItems.find((item) => item.ref.id === id)?.data.order
        )
          console.log("ALARM at ", id);
      });
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
