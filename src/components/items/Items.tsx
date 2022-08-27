import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Item } from "./Item";
import { Item as ItemType } from "../../types/types";

const Items = ({ items, id }: { items: ItemType[]; id: string }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <>
      <SortableContext
        id={id}
        items={items.map((item) => item.ref.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef}>
          {items.map((item) => (
            <Item key={item.ref.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </>
  );
};

export { Items };
