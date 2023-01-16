import { useDroppable } from "@dnd-kit/core";
import { List, Section } from "types/types";
import styles from "./styles/dnd.module.css";

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

  return (
    <div ref={setNodeRef} className={isOver ? styles.isOver : undefined}>
      {children}
    </div>
  );
};

const DroppableBackdrop = () => <div className={styles.overBackdrop}>drop</div>;

export { Droppable, DroppableBackdrop };
