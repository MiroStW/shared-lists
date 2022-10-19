import Link from "next/link";
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { List as ListType } from "../../types/types";
import styles from "../../styles/list.module.css";
import { Icon } from "../utils/Icon";
import { RenameListModal } from "./RenameListModal";
import { functions } from "../../firebase/firebase";

const List = ({ list }: { list: ListType }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [showRenameModual, setShowRenameModual] = useState(false);

  const deleteHandler = () => {
    console.log("delete");

    // need to add recursive delete
    const deleteFn = httpsCallable(functions, "recursiveDelete");
    deleteFn({ path: list.ref.path })
      .then((result) => {
        console.log(`Delete success: ${JSON.stringify(result)}`);
      })
      .catch((err) => {
        console.log("Delete failed, see console,");
        console.warn(err);
      });

    // add spinner and redirect to first list
  };

  return (
    <>
      <Link href={`/lists/${list.ref.id}`}>
        <div
          className={`${styles.list} ${isHovering ? styles.hover : ""}`}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className={styles.listTitle}>{list.data.name}</div>
          {isHovering && (
            <div className={styles.listMenu}>
              <div onClick={() => setShowRenameModual(true)}>
                <Icon iconName={"edit"} />
              </div>
              <div onClick={deleteHandler}>
                <Icon iconName={"delete"} />
              </div>
            </div>
          )}
        </div>
      </Link>
      {showRenameModual && (
        <RenameListModal list={list} setShowShareModal={setShowRenameModual} />
      )}
    </>
  );
};

export default List;
