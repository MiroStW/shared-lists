import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Item } from "./Item";
import { Item as ItemType, Section } from "../../types/types";

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
      <SortableContext
        id={id}
        items={items.map((item) => item.ref.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef}>
          <div>{section?.data.name}</div>
          {items.map((item) => (
            <Item key={item.ref.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </>
  );
};

export { Items };
