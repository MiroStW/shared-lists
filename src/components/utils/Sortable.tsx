import { useSortable } from "@dnd-kit/sortable";
import React from "react";
import { Item } from "../../types/types";

const Sortable = ({
  children,
  item,
}: {
  children: React.ReactNode;
  item: Item;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: item.ref.id,
      data: { item },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
};

export { Sortable };
