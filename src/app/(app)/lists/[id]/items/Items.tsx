import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Item as ItemType, Section } from "types/types";
import { Item } from "./Item";
import { SectionHeader } from "./SectionHeader";

const Items = ({
  items,
  containerId,
  section,
  hideCompleted,
  searchQuery = "",
}: {
  items: ItemType[];
  containerId: string;
  section?: Section;
  hideCompleted: boolean;
  searchQuery?: string;
}) => {
  const { setNodeRef } = useDroppable({ id: containerId });

  // Filter items by completed status and search query
  const filterItems = (itemList: ItemType[]) => {
    if (!itemList) return [];
    return itemList.filter((item) => {
      const matchesCompleted = !hideCompleted || !item.data.completed;
      const matchesSearch =
        searchQuery === "" ||
        item.data.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCompleted && matchesSearch;
    });
  };

  const filteredItems = filterItems(items);

  return (
    <>
      {items && (
        <SortableContext
          id={containerId}
          items={filteredItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef}>
            {section && <SectionHeader section={section} />}
          </div>
          {filteredItems.map((item) => (
            <Item
              key={item.id}
              item={item}
              focus={item.id.startsWith("newItem_")}
            />
          ))}
        </SortableContext>
      )}
    </>
  );
};

export { Items };
