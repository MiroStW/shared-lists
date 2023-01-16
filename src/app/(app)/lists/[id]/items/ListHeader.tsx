import { useDroppable } from "@dnd-kit/core";
import { Icon } from "app/(app)/shared/Icon";
import { Dispatch, SetStateAction, useState } from "react";
import { AdminList, Section } from "types/types";
import styles from "./items.module.css";
import { ShareModal } from "./ShareModal";

const ListHeader = ({
  list,
  setHideCompleted,
  hideCompleted,
}: {
  list: AdminList;
  setHideCompleted: Dispatch<SetStateAction<boolean>>;
  hideCompleted: boolean;
}) => {
  const [showShareModal, setShowShareModal] = useState(false);

  const Droppable = ({
    container,
    children,
  }: {
    container: AdminList | Section;
    children: React.ReactNode;
  }) => {
    const type = container.ref.parent.id === "lists" ? "list" : "section";
    const { setNodeRef } = useDroppable({
      id: container.ref.id,
      data: {
        type,
        element: container,
      },
    });

    return <div ref={setNodeRef}>{children}</div>;
  };

  return (
    <>
      <Droppable container={list}>
        <div className={styles.itemsHeader}>
          <div className={styles.listTitle}>
            <h2>{list.data.name}</h2>
          </div>
          <div className={styles.listOptions}>
            <div
              className={styles.listOption}
              onClick={() => setHideCompleted(!hideCompleted)}
            >
              {hideCompleted ? (
                <Icon iconName={"check_circle"} size={20} style={"outlined"} />
              ) : (
                <Icon iconName={"unpublished"} size={20} style={"outlined"} />
              )}
            </div>
            <div
              className={styles.listOption}
              onClick={() => setShowShareModal(true)}
            >
              <Icon iconName={"share"} size={20} />
            </div>
          </div>
        </div>
      </Droppable>
      {showShareModal && (
        <ShareModal setShowShareModal={setShowShareModal} list={list} />
      )}
    </>
  );
};

export default ListHeader;
