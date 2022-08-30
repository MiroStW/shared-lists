import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { orderBy, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { useAuth } from "../../firebase/authContext";
import {
  itemConverter,
  sectionConverter,
} from "../../firebase/firestoreConverter";
import { items as itemsCollection, sectionsOfList } from "../../firebase/useDb";
import styles from "../../styles/items.module.css";
import { Item as ItemType, List, Section } from "../../types/types";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { Item } from "./Item";
import { Items } from "./Items";

const ItemArea = ({ list }: { list: List }) => {
  const { user } = useAuth();
  const [items, loading, error] = useCollection<ItemType>(
    query(
      itemsCollection,
      where("list", "==", list.ref.id),
      where("ownerID", "==", user?.uid),
      orderBy("order", "asc")
    ).withConverter(itemConverter)
  );
  const [sections, loadingSections, errorSections] = useCollection<Section>(
    query(
      sectionsOfList(list),
      where("ownerID", "==", user?.uid)
    ).withConverter(sectionConverter)
  );
  const [localItems, setLocalItems] = useState<{
    [key: string]: ItemType[] | undefined;
  }>({});
  const [activeItem, setActiveItem] = useState<ItemType | null>();

  useEffect(() => {
    if (items) {
      const newLocalItems = {
        [list.ref.id]: items?.docs
          .map((item) => item.data())
          .filter((item) => item.ref.parent.parent?.id === list.ref.id),
      };

      sections?.docs
        .map((section) => section.data())
        .forEach((section) => {
          newLocalItems[section.ref.id] = items?.docs
            .map((item) => item.data())
            .filter((item) => item.ref.parent.parent?.id === section.ref.id);
        });

      setLocalItems(newLocalItems);
    }
  }, [items, list.ref.id, sections]);

  // useEffect(() => {
  //   console.log("localItems: ", localItems);
  // }, [localItems]);

  const findContainer = (id?: UniqueIdentifier) => {
    // return a dropped on list
    if (list.ref.id === id) return list;

    // returns a dropped on section
    const sectionContainer = sections?.docs.find(
      (section) => id === section.id
    );
    if (sectionContainer) return sectionContainer.data();

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
        : sections?.docs
            .find((section) => overItemParentId === section.id)
            ?.data();
    if (overItemParent) return overItemParent;

    return undefined;
  };

  const handleDragOver = (e: DragOverEvent) => {
    // handle move to new container
    const { active, over } = e;
    // console.log(active.id);
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over?.id);
    console.log("containers: ", activeContainer?.ref.id, overContainer?.ref.id);
    if (
      !activeContainer ||
      !overContainer ||
      !over ||
      activeContainer.ref.id === overContainer.ref.id
    ) {
      return;
    }

    // console.log("over: ", over.id);
    // move activeItem to new area (only locally! change items object)
    // problem: spamming updates to firestore on every "dragOver" event
    // problem: potentially loosing refernce to activeItem because items get
    // updated live
    // solution: somehow only locally add new item to new list and hide
    // old one
    // only move DOM node && do update on dragEnd

    console.log(
      `moved ${activeItem?.data.name} from ${activeContainer.data.name} to ${overContainer.data.name}`
    );
    setLocalItems((prev) => {
      const activeItems = prev[activeContainer.ref.id]!;
      const overItems = prev[overContainer.ref.id]!;
      // console.log(
      //   "activeItems Ids: ",
      //   activeItems.map((item) => item.ref.id)
      // );
      // console.log(
      //   "active.data.current?.item.ref.id: ",
      //   active.data.current?.item.ref.id
      // );
      // Find the indexes for the items
      const activeIndex = activeItems
        ?.map((item) => item.ref.id)
        .indexOf(active.data.current?.item.ref.id);
      const overIndex = overItems
        ?.map((item) => item.ref.id)
        .indexOf(over.data.current?.item.ref.id);

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

      // console.log("activeIndex: ", activeIndex);
      // console.log("newIndex: ", newIndex);
      // console.log({
      //   ...prev,
      //   [activeContainer.ref.id]: [
      //     ...activeItems.filter((item) => item.ref.id !== activeItem?.ref.id),
      //   ],
      //   [overContainer.ref.id]: [
      //     ...overItems.slice(0, newIndex),
      //     activeItems[activeIndex],
      //     ...overItems.slice(newIndex, overItems.length),
      //   ],
      // });
      // this is called on every "over" event, so often multiple times
      // however activeItem is already removed from activeContainer, resulting
      // in activeIndex to be -1 (not found)
      // regardless, activeIndex is used below, resulting in
      // activeItems[activeIndex] to be undefined
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
    // handle order within a container
    const { active, over } = e;
    const overItem = over?.data.current?.item;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over?.id);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer !== overContainer
    ) {
      return;
    }

    if (items && activeContainer && overContainer && activeItem && overItem) {
      const overContainerItems = items.docs
        .filter((item) => item.ref.parent.parent?.id === overContainer.ref.id)
        .map((item) => item.data());

      // establish new order
      const oldItemOrder = overContainerItems.map((item) => item.ref.id);
      // console.log(active.id);
      // console.log(over?.id);
      const newIndex = oldItemOrder.indexOf(over?.id as string);
      const oldIndex = oldItemOrder.indexOf(active.id as string);
      // console.log(oldIndex, newIndex);
      const newItemOrder =
        activeContainer.ref.id === overContainer.ref.id
          ? arrayMove(oldItemOrder, oldIndex, newIndex)
          : oldItemOrder.splice(newIndex, 0, activeItem.ref.id);
      // console.log("old order:");
      // console.log(oldItemOrder);
      // console.log("new order:");
      // console.log(newItemOrder);
      // 2. map through the items
      newItemOrder.forEach((id, index) => {
        // 3. if oldIndex != new index:
        if (index !== oldItemOrder.indexOf(id)) {
          // 4. get ref of item by id:
          const itemObj = overContainerItems.find((item) => item.ref.id === id);

          // 5. updateDoc(item.ref, { order: index });
          if (itemObj) updateDoc(itemObj.ref, "order", index);
        }
      });
      // caluclate new order number
      // now delete & recreate item with new order number
      // overContainer.ref.parent.id === "lists"
      //   ? addDoc(
      //       itemsOfList(overContainer as List),
      //       createItemData(active.data.current?.item.data.name, user, list)
      //     )
      //   : addDoc(
      //       itemsOfSection(overContainer as Section),
      //       createItemData(active.data.current?.item.data.name, user, list)
      //     );
      // deleteDoc(active.data.current?.item.ref);
      setActiveItem(null);
    }
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveItem(e.active.data.current?.item as ItemType);
  };

  return (
    <div className={styles.itemsArea}>
      <DndContext
        onDragStart={(e) => handleDragStart(e)}
        onDragOver={(e) => handleDragOver(e)}
        onDragEnd={(e) => handleDragEnd(e)}
      >
        <div className={styles.itemsHeader}>
          <h2>{list.data.name}</h2>
        </div>
        <div className={styles.itemsList}>
          {error && <Error msg={error.message} />}
          {errorSections && <Error msg={errorSections.message} />}
          {loading || loadingSections ? (
            <Loading />
          ) : (
            <>
              {Object.keys(localItems).length > 0 && (
                <>
                  <Items id={list.ref.id} items={localItems[list.ref.id]!} />
                  {sections?.docs
                    .map((sectionObj) => sectionObj.data())
                    .map((section) => (
                      <div key={section.ref.id}>
                        <div>{section.data.name}</div>
                        <Items
                          id={section.ref.id}
                          items={localItems[section.ref.id]!}
                        />
                      </div>
                    ))}
                </>
              )}
            </>
          )}
        </div>
      </DndContext>
      <DragOverlay>
        {activeItem ? (
          <div>
            xxxxx
            <Item item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </div>
  );
};
export { ItemArea };
