import { useDroppable } from "@dnd-kit/core";
import { List, Section } from "../../types/types";

const Droppable = ({
  children,
  area,
  type,
}: {
  children: React.ReactNode;
  area: Section | List;
  type: "section" | "list" | "section-header" | "list-header";
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `droppable-${type}-${area.ref.id}`,
    data: {
      area,
      type,
    },
  });
  const style = {
    color: isOver ? "green" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
};

export { Droppable };
