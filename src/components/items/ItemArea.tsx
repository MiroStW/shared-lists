import { DragEndEvent, DndContext } from "@dnd-kit/core";
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
import { items, itemsOfList, itemsOfSection } from "../../firebase/useDb";
import styles from "../../styles/items.module.css";
import { Item as ItemType, List, Section } from "../../types/types";
import { Droppable } from "../utils/Droppable";
import { Item } from "./Item";
import { Items } from "./Items";
import { Sections } from "./Sections";

const ItemArea = ({ list }: { list: List }) => {
  const [activeItem, setActiveItem] = useState<ItemType | null>(null);
  // query all items of a list in object {root: [item1, item2, item3], section1:
  // [item1, item2], section2: [item1, item2]}

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

  const handleDragStart = (e: DragStartEvent) => {
    setActiveItem(e.active.data.current?.item as ItemType);
  };

  return (
    <div className={styles.itemsArea}>
      <DndContext onDragStart={(e) => handleDragStart(e)} onDragEnd={(e) => handleDragEnd(e)}>
        <div className={styles.itemsHeader}>
          <h2>{list.data.name}</h2>
        </div>
        <div className={styles.itemsList}>
          {items.map((area) => {
            if(area !== "root") <div>{area.key}</div>
          <Items items={area} />
          })}
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
