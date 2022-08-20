import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { addDoc, deleteDoc } from "firebase/firestore";
import { itemsOfSection } from "../../firebase/useDb";
import styles from "../../styles/items.module.css";
import { Item, List, Section } from "../../types/types";
import { Items } from "./Items";
import { Sections } from "./Sections";

const ItemArea = ({ list }: { list: List }) => {
  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over) {
      const item = e.active.data.current?.item as Item;
      const section = e.over.data.current?.section as Section;

      addDoc(itemsOfSection(section), item.data);
      deleteDoc(item.ref);
    }
  };

  return (
    <div className={styles.itemsArea}>
      <div className={styles.itemsHeader}>
        <h2>{list.data.name}</h2>
      </div>
      <div className={styles.itemsList}>
        <DndContext onDragEnd={(e) => handleDragEnd(e)}>
          <Items parent={list} />
          <Sections list={list} />
        </DndContext>
      </div>
    </div>
  );
};

export { ItemArea };
