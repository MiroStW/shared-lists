import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import styles from "../../styles/items.module.css";
import { AdminList, Item, List, Section } from "../../types/types";
import { Icon } from "../utils/Icon";
import { Items } from "./Items";
import { ShareModal } from "./ShareModal";

const ItemArea = ({
  list,
  sections,
  items,
}: {
  list: AdminList;
  sections: Section[];
  items: { [key: string]: Item[] };
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
              onClick={() => setShowShareModal(true)}
            >
              <Icon iconName={"share"} />
            </div>
          </div>
        </div>
      </Droppable>
      <div className={styles.itemsList}>
        {Object.keys(items).length > 0 && (
          <>
            {Object.keys(items).reduce(
              (sum, area) => sum + items[area].length,
              0
            ) === 0 && Object.keys(sections).length === 0 ? (
              <div>No items yet</div>
            ) : (
              <>
                <Items containerId={list.ref.id} items={items[list.ref.id]} />
                {sections.length > 0 &&
                  sections.map((section) => (
                    <div key={section.ref.id}>
                      <Items
                        section={section}
                        containerId={section.ref.id}
                        items={items[section.ref.id]}
                      />
                    </div>
                  ))}
              </>
            )}
          </>
        )}
      </div>
      {showShareModal && (
        <ShareModal setShowShareModal={setShowShareModal} list={list} />
      )}
    </>
  );
};

export { ItemArea };
