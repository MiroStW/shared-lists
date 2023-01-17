import { useState } from "react";
import { AdminList, Item, Section } from "types/types";
import styles from "./items.module.css";
import { Items } from "./Items";
import ListHeader from "./ListHeader";

const ItemArea = ({
  list,
  sections,
  items,
}: {
  list: AdminList;
  sections: Section[];
  items: { [key: string]: Item[] };
}) => {
  const [hideCompleted, setHideCompleted] = useState(false);

  return (
    <>
      <ListHeader
        list={list}
        setHideCompleted={setHideCompleted}
        hideCompleted={hideCompleted}
      />
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
                <Items
                  containerId={list.ref.id}
                  items={items[list.ref.id]}
                  hideCompleted={hideCompleted}
                />
                {sections.length > 0 &&
                  sections.map((section) => (
                    <div key={section.ref.id}>
                      <Items
                        section={section}
                        containerId={section.ref.id}
                        items={items[section.ref.id]}
                        hideCompleted={hideCompleted}
                      />
                    </div>
                  ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export { ItemArea };
