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
  containerId,
  section,
  hideCompleted,
}: {
  items: ItemType[];
  containerId: string;
  section?: Section;
  hideCompleted: boolean;
}) => {
  const { setNodeRef } = useDroppable({ id: containerId });

  return (
    <>
      {items && (
        <SortableContext
          id={containerId}
          items={items
            .filter((item) => hideCompleted || !item.data.completed)
            .map((item) => item.ref.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef}>
            {section && <SectionHeader section={section} />}
          </div>
          {items
            .filter((item) => hideCompleted || !item.data.completed)
            .map((item) => (
              <Item
                key={item.ref.id}
                item={item}
                focus={item.ref.id.startsWith("newItem_")}
              />
            ))}
        </SortableContext>
      )}
    </>
  );
};

export { Items };
