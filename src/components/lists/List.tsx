import Link from "next/link";
import { useState } from "react";
import { List as ListType } from "../../types/types";
import styles from "../../styles/list.module.css";
import { Icon } from "../utils/Icon";
import { RenameListModal } from "./RenameListModal";
import { DeleteListModal } from "./DeleteListModal";

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
        <RenameListModal list={list} setShowModal={setShowRenameModual} />
      )}
      {showDeleteModal && (
        <DeleteListModal list={list} setShowModal={setShowDeleteModal} />
      )}
    </>
  );
};

export default List;
