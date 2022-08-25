import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { addDoc, deleteDoc } from "firebase/firestore";
import { useState } from "react";
import { itemsOfList, itemsOfSection } from "../../firebase/useDb";
import styles from "../../styles/items.module.css";
import { Item as ItemType, List, Section } from "../../types/types";
import { Droppable } from "../utils/Droppable";
import { Item } from "./Item";
import { Items } from "./Items";
import { Sections } from "./Sections";

const ItemArea = ({ list }: { list: List }) => {
  const [activeItem, setActiveItem] = useState<ItemType | null>(null);

  // const oldHandleDragEnd = (e: DragEndEvent) => {
  //   if (e.over) {
  //     const item = e.active.data.current?.item as ItemType;
  //     const type = e.over.data.current?.type as
  //       | "section"
  //       | "list"
  //       | "section-header"
  //       | "list-header";
  //     const area = e.over.data.current?.area as Section | List;

  //     console.log(item);
  //     console.log(type);
  //     console.log(area);

  //     if (type === "section" || type === "section-header") {
  //       addDoc(itemsOfSection(area), item.data);
  //     } else if (type === "list" || type === "list-header") {
  //       addDoc(itemsOfList(area as List), item.data);
  //     }

  //     deleteDoc(item.ref);
  //   }
  // };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveItem(e.active.data.current?.item as ItemType);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = e;

    if (active.id !== over?.id && items) {
      // 1. establish newItemOrder
      const oldItemOrder = items.docs.map((item) => item.id);
      console.log(active.id);
      console.log(over?.id);
      const oldIndex = oldItemOrder.indexOf(active.id as string);
      const newIndex = oldItemOrder.indexOf(over?.id as string);

      console.log(oldIndex, newIndex);
      const newItemOrder = arrayMove(oldItemOrder, oldIndex, newIndex);

      console.log("old order:");
      console.log(oldItemOrder);
      console.log("new order:");
      console.log(newItemOrder);
      // 2. map through the items
      newItemOrder.forEach((id, index) => {
        // 3. if oldIndex != new index:
        if (index !== oldItemOrder.indexOf(id)) {
          // 4. get ref of item by id:
          const itemObj = items.docs.find((item) => item.id === id);

          // 5. updateDoc(item.ref, { order: index });
          if (itemObj) updateDoc(itemObj.ref, "order", index);
        }
      });
    }
  };

  return (
    <div className={styles.itemsArea}>
      <DndContext
        onDragStart={(e) => handleDragStart(e)}
        onDragEnd={(e) => handleDragEnd(e)}
      >
        {/* <Droppable area={list} type="list-header"> */}
        <div className={styles.itemsHeader}>
          <h2>{list.data.name}</h2>
        </div>
        {/* </Droppable> */}

        <div className={styles.itemsList}>
          {/* <Droppable area={list} type="list"> */}
          <Items parent={list} />
          {/* </Droppable> */}
          <Sections list={list} />
        </div>
      </DndContext>
      <DragOverlay>
        {activeItem ? <Item item={activeItem} /> : null}
      </DragOverlay>
    </div>
  );
};

export { ItemArea };
