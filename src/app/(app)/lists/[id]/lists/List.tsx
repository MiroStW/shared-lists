import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { AdminList, List as ListType } from "types/types";
import { Icon } from "app/shared/Icon";
import styles from "./list.module.css";
import { RenameModal } from "./RenameModal";
import { DeleteModal } from "./DeleteModal";

const List = ({
  list,
  setShowMobileLists,
}: {
  list: ListType | AdminList;
  setShowMobileLists: Dispatch<SetStateAction<boolean>>;
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [showRenameModual, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div
      className={`${styles.list} ${isHovering && styles.hover}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Link href={`/lists/${list.ref.id}`} className={styles.listTitle}>
        <div onClick={() => setShowMobileLists(false)}>{list.data.name}</div>
      </Link>
      {isHovering && (
        <div className={styles.listMenu}>
          <div onClick={() => setShowRenameModal(true)}>
            <Icon iconName={"edit"} />
          </div>
          <div onClick={() => setShowDeleteModal(true)}>
            <Icon iconName={"delete"} />
          </div>
        </div>
      )}
      {showRenameModual && (
        <RenameModal collection={list} setShowModal={setShowRenameModal} />
      )}
      {showDeleteModal && (
        <DeleteModal collection={list} setShowModal={setShowDeleteModal} />
      )}
    </div>
  );
};

export default List;
