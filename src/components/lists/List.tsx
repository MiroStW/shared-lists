import Link from "next/link";
import { useState } from "react";
import { List as ListType } from "../../types/types";
import styles from "../../styles/list.module.css";
import { Icon } from "../utils/Icon";
import { RenameModal } from "./RenameModal";
import { DeleteModal } from "./DeleteModal";

const List = ({ list }: { list: ListType }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [showRenameModual, setShowRenameModual] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
              <div onClick={() => setShowDeleteModal(true)}>
                <Icon iconName={"delete"} />
              </div>
            </div>
          )}
        </div>
      </Link>
      {showRenameModual && (
        <RenameModal collection={list} setShowModal={setShowRenameModual} />
      )}
      {showDeleteModal && (
        <DeleteModal collection={list} setShowModal={setShowDeleteModal} />
      )}
    </>
  );
};

export default List;
