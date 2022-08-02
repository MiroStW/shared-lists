import { useEffect } from "react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { User } from "firebase/auth";
import { db } from "../../firebase/firebase";
import List from "./List";
import { listConverter } from "../../firebase/firestoreConverter";
import styles from "../../styles/lists.module.css";

const Lists = ({ user }: { user: User }) => {
  const [lists, loading, error] = useCollection(
    query(
      collection(db, "lists"),
      where("ownerID", "==", user?.uid),
      where("isArchived", "==", false)
      // orderBy("createdDate", "desc")
    ).withConverter(listConverter),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );

  useEffect(() => {
    console.log(lists);
  }, [lists]);

  return (
    <div className={styles.listsArea}>
      <div className="listsHeader">
        <h2>Lists</h2>
      </div>
      <div className={styles.listList}>
        {lists?.docs.map((list) => {
          return <List key={list.id} list={list.data()} />;
        })}
      </div>
    </div>
  );
};

export { Lists };
