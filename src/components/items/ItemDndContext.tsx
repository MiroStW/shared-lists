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
import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { useAuth } from "../../firebase/authContext";
import { createItemData } from "../../firebase/factory";
import { itemsOfList, itemsOfSection } from "../../firebase/useDb";
import { Item as ItemType, Section, List } from "../../types/types";
import { Item } from "./Item";

const ItemDndContext = ({
  children,
  list,
  sections,
  localItems,
  setLocalItems,
  items,
}: {
  children: ReactNode;
  list: List;
  sections?: Section[];
  localItems: { [key: string]: ItemType[] };
  setLocalItems: Dispatch<
    SetStateAction<{
      [key: string]: ItemType[];
    }>
  >;
  items: ItemType[];
}) => {
  const { user } = useAuth();
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
      delay: 0,
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

  const handleDragOver = (e: DragOverEvent) => {
    // handle move to new container
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
      const activeItems = prev[activeContainer.ref.id]!;
      const overItems = prev[overContainer.ref.id]!;

      // Find the indexes for the items
      const activeIndex = activeItems
        ?.map((item) => item.ref.id)
        .indexOf(active.data.current?.item.ref.id);
      const overIndex = overItems
        ?.map((item) => item.ref.id)
        .indexOf(over.data.current?.item.ref.id);
      // console.log("overIndex: ", overIndex);

      let newIndex;
      if (over.id in prev) {
        // We're at the root droppable of a container
        newIndex = overItems.length + 1;
      } else {
        const isBelowLastItem =
          over &&
          overIndex === overItems.length - 1 &&
          active.rect.current.translated!.top >
            over.rect.top + over.rect.height;

        const modifier = isBelowLastItem ? 1 : 0;

        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer.ref.id]: [
          ...activeItems.filter((item) => item.ref.id !== activeItem?.ref.id),
        ],
        [overContainer.ref.id]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex, overItems.length),
        ],
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
              itemsOfList(overContainer as List),
              createItemData(activeItem.data.name, user, list, newIndex)
            )
          : addDoc(
              itemsOfSection(overContainer as Section),
              createItemData(
                active.data.current?.item.data.name,
                user,
                list,
                newIndex
              )
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
      <DndContext
        sensors={sensors}
        modifiers={[restrictToVerticalAxis]}
        collisionDetection={closestCenter}
        onDragStart={(e) => handleDragStart(e)}
        onDragOver={(e) => handleDragOver(e)}
        onDragEnd={(e) => handleDragEnd(e)}
      >
        {children}

        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div>
              <Item item={activeItem} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

export { ItemDndContext };
