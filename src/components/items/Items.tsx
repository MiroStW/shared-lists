import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Item } from "./Item";
import { Item as ItemType } from "../../types/types";

const Items = ({ items, id }: { items: ItemType[]; id: string }) => {
  return (
    <>
      <SortableContext
        id={id}
        items={items.map((item) => item.ref.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <Item key={item.ref.id} item={item} />
        ))}
      </SortableContext>
    </>
  );
};

export { Items };
