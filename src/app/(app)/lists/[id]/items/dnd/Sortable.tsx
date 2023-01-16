import { DraggableAttributes } from "@dnd-kit/core";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import React from "react";
import { Item } from "types/types";

const Sortable = ({
  render,
  item,
}: {
  render: (
    listeners?: SyntheticListenerMap,
    attributes?: DraggableAttributes
  ) => React.ReactNode;
  item: Item;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: item.ref.id,
      data: { element: item, type: "item" },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      {render(listeners, attributes)}
    </div>
  );
};

export { Sortable };
