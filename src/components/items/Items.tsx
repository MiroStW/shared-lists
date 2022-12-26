import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Item } from "./Item";
import { Item as ItemType, Section } from "../../types/types";
import { SectionHeader } from "./SectionHeader";

const Items = ({
  items,
  containerId,
  section,
}: {
  items: ItemType[];
  containerId: string;
  section?: Section;
}) => {
  const { setNodeRef } = useDroppable({ id: containerId });

  return (
    <>
      {items && (
        <SortableContext
          id={containerId}
          items={items?.map((item) => item.ref.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef}>
            {section && <SectionHeader section={section} />}
          </div>
          {items.map((item) => (
            <Item
              key={item.ref.id}
              item={item}
              focus={item.ref.id === "newItem"}
            />
          ))}
        </SortableContext>
      )}
    </>
  );
};

export { Items };
