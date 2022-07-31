import { collection, orderBy, query, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { useEffect } from "react";
import { auth, db } from "../../firebase/firebase";
import List from "./List";
import { listConverter } from "../../firebase/firestoreConverter";

const Lists = () => {
  const [lists, loading, error] = useCollection(
    query(
      collection(db, "lists"),
      where("ownerID", "==", auth.currentUser?.uid),
      where("isArchived", "==", false)
      // orderBy("createdDate", "desc")
    ).withConverter(listConverter),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );

  useEffect(() => {
    console.log(lists);
  }, [lists]);

  return (
    <div className="listsArea">
      <div className="listsHeader">
        <h2>Lists</h2>
      </div>
      <div className="listList">
        {lists?.docs.map((list) => {
          return <List key={list.id} list={list.data()} />;
        })}
      </div>
    </div>
  );
};

export { Lists };
