import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { addDoc, deleteDoc } from "firebase/firestore";
import { itemsOfList, itemsOfSection } from "../../firebase/useDb";
import styles from "../../styles/items.module.css";
import { Item, List, Section } from "../../types/types";
import { Droppable } from "../utils/Droppable";
import { Items } from "./Items";
import { Sections } from "./Sections";

const ItemArea = ({ list }: { list: List }) => {
  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over) {
      const item = e.active.data.current?.item as Item;
      const type = e.over.data.current?.type as
        | "section"
        | "list"
        | "section-header"
        | "list-header";
      const area = e.over.data.current?.area as Section | List;

      console.log(item);
      console.log(type);
      console.log(area);

      if (type === "section" || type === "section-header") {
        addDoc(itemsOfSection(area), item.data);
      } else if (type === "list" || type === "list-header") {
        addDoc(itemsOfList(area as List), item.data);
      }

      deleteDoc(item.ref);
    }
  };

  return (
    <div className={styles.itemsArea}>
      <DndContext onDragEnd={(e) => handleDragEnd(e)}>
        <Droppable area={list} type="list-header">
          <div className={styles.itemsHeader}>
            <h2>{list.data.name}</h2>
          </div>
        </Droppable>

        <div className={styles.itemsList}>
          <Droppable area={list} type="list">
            <Items parent={list} />
          </Droppable>
          <Sections list={list} />
        </div>
      </DndContext>
    </div>
  );
};

export { ItemArea };
