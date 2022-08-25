import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { orderBy, query, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { useAuth } from "../../firebase/authContext";
import { itemConverter } from "../../firebase/firestoreConverter";
import { itemsOfList, itemsOfSection } from "../../firebase/useDb";
import { List, Section } from "../../types/types";
import { Error } from "../utils/Error";
import { Loading } from "../utils/Loading";
import { Item } from "./Item";

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

  return (
    <>
      {error && <Error msg={error.message} />}
      {loading ? (
        <Loading />
      ) : (
        items && (
          <>
            <SortableContext
              items={items.docs.map((item) => item.ref.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.docs.map((item) => (
                <Item key={item.ref.id} item={item.data()} />
              ))}
            </SortableContext>
          </>
        )
        // </Droppable>
      )}
    </>
  );
};

export { Items };
