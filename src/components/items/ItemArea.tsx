import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
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
import { Item as ItemType, List } from "../../types/types";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { Item } from "./Item";
import { Items } from "./Items";

const ItemArea = ({ list }: { list: List }) => {
  const { user } = useAuth();
  const [items, loading, error] = useCollection(
    query(
      itemsCollection,
      where("list", "==", list.ref.id),
      where("ownerID", "==", user?.uid),
      orderBy("order", "asc")
    ).withConverter(itemConverter)
  );
  const [sections, loadingSections, errorSections] = useCollection(
    query(
      sectionsOfList(list),
      where("ownerID", "==", user?.uid)
    ).withConverter(sectionConverter)
  );
  const [activeItem, setActiveItem] = useState<ItemType | null>();

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
      <DndContext
        onDragStart={(e) => handleDragStart(e)}
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
              {items && (
                <>
                  <Items
                    id={list.ref.id}
                    items={items.docs
                      .filter(
                        (item) => item.ref.parent.parent?.id === list.ref.id
                      )
                      .map((item) => item.data())}
                  />
                  {sections?.docs
                    .map((sectionObj) => sectionObj.data())
                    .map((section) => (
                      <div key={section.ref.id}>
                        <div>{section.data.name}</div>
                        <Items
                          id={section.ref.id}
                          items={items.docs
                            .filter(
                              (item) =>
                                item.ref.parent.parent?.id === section.ref.id
                            )
                            .map((item) => item.data())}
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
        {activeItem ? <Item item={activeItem} /> : null}
      </DragOverlay>
    </div>
  );
};
export { ItemArea };
