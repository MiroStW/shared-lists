import { User } from "firebase/auth";
import { query, collection, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { Item } from "./Item";
import styles from "../../styles/items.module.css";
import { List } from "../../types/types";
import { db } from "../../firebase/firebase";
import { itemConverter } from "../../firebase/firestoreConverter";
import { Loading } from "../Loading";
import { Error } from "../Error";

const Items = ({ list, user }: { list: List; user: User }) => {
  const [items, loading, error] = useCollection(
    query(
      collection(db, `lists/${list.ref.id}/items`),
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
        {error && <Error msg={error} />}
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
