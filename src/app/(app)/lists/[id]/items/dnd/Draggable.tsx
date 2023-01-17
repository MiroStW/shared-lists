import { useDraggable } from "@dnd-kit/core";
import React from "react";
import { Item } from "types/types";

const Draggable = ({
  children,
  item,
}: {
  children: React.ReactNode;
  item: Item;
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `draggable-${item.ref.id}`,
    data: { item },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
};

export { Draggable };
