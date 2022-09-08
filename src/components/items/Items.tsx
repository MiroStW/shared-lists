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
  id,
  section,
}: {
  items: ItemType[];
  id: string;
  section?: Section;
}) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <>
      {items && (
        <SortableContext
          id={id}
          items={items?.map((item) => item.ref.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef}>
            {section && <SectionHeader section={section} />}
          </div>
          {items.map((item) => (
            <Item key={item.ref.id} item={item} />
          ))}
        </SortableContext>
      )}
    </>
  );
};

export { Items };
