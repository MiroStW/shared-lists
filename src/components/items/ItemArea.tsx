import styles from "../../styles/items.module.css";
import { Item, List, Section } from "../../types/types";
import { Items } from "./Items";

const ItemArea = ({
  list,
  sections,
  items,
}: {
  list: List;
  sections: Section[];
  items: { [key: string]: Item[] };
}) => {
  return (
    <>
      <div className={styles.itemsHeader}>
        <h2>{list.data.name}</h2>
      </div>
      <div className={styles.itemsList}>
        {Object.keys(items).length > 0 && (
          <>
            <Items id={list.ref.id} items={items[list.ref.id]!} />
            {sections.map((section) => (
              <div key={section.ref.id}>
                <Items
                  section={section}
                  id={section.ref.id}
                  items={items[section.ref.id]!}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
};

export { ItemArea };
