import { orderBy, query, updateDoc, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useAuth } from "../../firebase/authContext";
import { itemConverter } from "../../firebase/firestoreConverter";
import { itemsOfList, itemsOfSection } from "../../firebase/useDb";
import { Loading } from "../utils/Loading";
import { Item } from "./Item";
import { Error } from "../utils/Error";
import { List, Section } from "../../types/types";

const Items = ({ parent }: { parent: List | Section }) => {
  const { user } = useAuth();
  const [items, loading, error] = useCollection(
    query(
      parent.ref.parent.id === "lists"
        ? itemsOfList(parent as List)
        : itemsOfSection(parent),
      where("ownerID", "==", user?.uid),
      orderBy("order", "asc")
    ).withConverter(itemConverter),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );

  const dragEndHandler = (e: DragEndEvent) => {
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
    <>
      {error && <Error msg={error.message} />}
      {loading ? (
        <Loading />
      ) : (
        items && (
          <>
            <DndContext onDragEnd={dragEndHandler}>
              <SortableContext
                items={items.docs.map((item) => item.ref.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.docs.map((item) => (
                  <Item key={item.ref.id} item={item.data()} />
                ))}
              </SortableContext>
            </DndContext>
          </>
        )
        // </Droppable>
      )}
    </>
  );
};

export { Items };
