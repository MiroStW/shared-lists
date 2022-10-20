import { useState } from "react";
import styles from "../../styles/items.module.css";
import { Item, List, Section } from "../../types/types";
import { Icon } from "../utils/Icon";
import { Items } from "./Items";
import { ShareModal } from "./ShareModal";

const ItemArea = ({
  list,
  sections,
  items,
}: {
  list: List;
  sections: Section[];
  items: { [key: string]: Item[] };
}) => {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
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
                <Items id={list.ref.id} items={items[list.ref.id]} />
                {sections.length > 0 &&
                  sections.map((section) => (
                    <div key={section.ref.id}>
                      <Items
                        section={section}
                        id={section.ref.id}
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
