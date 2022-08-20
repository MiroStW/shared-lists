import { useDroppable } from "@dnd-kit/core";
import { Section } from "../../types/types";

const Droppable = ({
  children,
  section,
}: {
  children: React.ReactNode;
  section: Section;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `droppable-${section.ref.id}`,
    data: {
      section,
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
