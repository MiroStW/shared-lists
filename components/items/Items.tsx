import { query, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
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
      where("ownerID", "==", user?.uid)
      // orderBy("createdDate", "desc")
    ).withConverter(itemConverter),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );
  return (
    <>
      {error && <Error msg={error.message} />}
      {loading ? (
        <Loading />
      ) : (
        items?.docs.map((item) => <Item key={item.ref.id} item={item.data()} />)
      )}
    </>
  );
};

export { Items };
