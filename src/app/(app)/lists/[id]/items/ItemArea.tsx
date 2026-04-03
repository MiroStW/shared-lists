import { useState } from "react";
import { AdminList, Item, Section } from "types/types";
import styles from "./items.module.css";
import { Items } from "./Items";
import ListHeader from "./ListHeader";
import { SearchBar } from "./SearchBar";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <>
      <ListHeader
        list={list}
        setHideCompleted={setHideCompleted}
        hideCompleted={hideCompleted}
      />
      <div>
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
                  containerId={list.id}
                  items={items[list.id]}
                  hideCompleted={hideCompleted}
                  searchQuery={searchQuery}
                />
                {sections.length > 0 &&
                  sections.map((section) => (
                    <div key={section.id}>
                      <Items
                        section={section}
                        containerId={section.id}
                        items={items[section.id]}
                        hideCompleted={hideCompleted}
                        searchQuery={searchQuery}
                      />
                    </div>
                  ))}
              </>
            )}
          </>
        )}
      </div>
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isExpanded={isSearchExpanded}
        setIsExpanded={setIsSearchExpanded}
      />
    </>
  );
};

export { ItemArea };
