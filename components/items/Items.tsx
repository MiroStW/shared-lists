import { query, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { Item } from "./Item";
import styles from "../../styles/items.module.css";
import { List } from "../../types/types";
import { itemConverter } from "../../firebase/firestoreConverter";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { useAuth } from "../../firebase/authContext";
import { itemsOfList } from "../../firebase/useDb";

const Items = ({ list }: { list: List }) => {
  const { user } = useAuth();
  const [items, loading, error] = useCollection(
    query(
      itemsOfList(list),
      where("ownerID", "==", user?.uid)
      // orderBy("createdDate", "desc")
    ).withConverter(itemConverter),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );

  return (
    <div className={styles.itemsArea}>
      <div className={styles.itemsHeader}>
        <h2>Items</h2>
      </div>
      <div className={styles.itemsList}>
        {error && <Error msg={error.message} />}
        {loading ? (
          <Loading />
        ) : (
          items?.docs.map((item) => (
            <Item key={item.ref.id} item={item.data()} />
          ))
        )}
      </div>
    </div>
  );
};

export { Items };
