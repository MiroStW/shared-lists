"use client";

import {
  useSensor,
  TouchSensor,
  MouseSensor,
  useSensors,
  UniqueIdentifier,
  DragOverEvent,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  DndContext,
  DragOverlay,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import { useItems } from "app/(app)/lists/[id]/itemsContext";
import { Item as ItemType, Section, AdminList } from "types/types";
import { Item } from "./Item";
import { ItemArea } from "./ItemArea";
import LoadingItems from "app/shared/LoadingItems";
import { useClientSession } from "app/sessionContext";

const ItemDndContext = ({ list }: { list: AdminList }) => {
  const { user } = useClientSession();
  const { items, sections, localItems, setLocalItems, loading, refreshItems } = useItems();
  const [activeItem, setActiveItem] = useState<ItemType | null>();

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      delay: 120,
      tolerance: 5,
    },
  });

  const sensors = useSensors(touchSensor, mouseSensor);

  const findContainer = (id?: UniqueIdentifier) => {
    if (list.id === id) return list;

    const sectionContainer = sections?.find((section) => id === section.id);
    if (sectionContainer) return sectionContainer;

    const overItemParentId = Object.keys(localItems).find((ContainerId) =>
      localItems[ContainerId]?.find((item) => item.id === id)
    );

    const overItemParent =
      overItemParentId === list.id
        ? list
        : sections?.find((section) => overItemParentId === section.id);
    if (overItemParent) return overItemParent;

    return undefined;
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over?.id);

    if (
      !activeContainer ||
      !overContainer ||
      !over ||
      activeContainer.id === overContainer.id
    ) {
      return;
    }

    setLocalItems((prev) => {
      return {
        ...prev,
        [activeContainer.id]: [
          ...prev[activeContainer.id]!.filter(
            (item) => item.id !== activeItem?.id
          ),
        ],
        [overContainer.id]: [...prev[overContainer.id]!, activeItem!],
      };
    });
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    const overElement = over?.data.current?.element as
      | AdminList
      | Section
      | ItemType;
    const overType = over?.data.current?.type as "list" | "section" | "item";

    const activeContainerId = activeItem?.data.sectionID || list.id;
    const overContainer = findContainer(over?.id);

    if (
      items &&
      overContainer &&
      activeItem &&
      overElement &&
      user
    ) {
      const overContainerId = overContainer.id;

      const overContainerItems = [...(localItems[overContainerId] || [])];

      const oldIndex = overContainerItems.findIndex(i => i.id === active.id);
      let newIndex =
        overType === "list" || overType === "section"
          ? localItems[overContainerId].length
          : localItems[overContainerId].findIndex(i => i.id === overElement.id);

      if (newIndex === -1) newIndex = localItems[overContainerId].length;

      const finalReorderedItems = arrayMove(overContainerItems, oldIndex, newIndex);

      // Prepare bulk update
      const updates = finalReorderedItems.map((item, index) => ({
        id: item.id,
        order: index,
        sectionID: overContainerId === list.id ? null : overContainerId
      })).filter(u => !u.id.startsWith("newItem_"));

      try {
        const response = await fetch(`/api/lists/${list.id}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updates }),
        });

        if (response.ok) {
          refreshItems();
        }
      } catch (err) {
        console.error("Reorder failed:", err);
      }

      setActiveItem(null);
    }
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveItem(e.active.data.current?.element as ItemType);
  };

  return (
    <>
      {loading ? (
        <LoadingItems />
      ) : (
        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis]}
          collisionDetection={closestCenter}
          onDragStart={(e) => handleDragStart(e)}
          onDragOver={(e) => handleDragOver(e)}
          onDragEnd={(e) => handleDragEnd(e)}
        >
          <ItemArea list={list} sections={sections} items={localItems} />

          <DragOverlay dropAnimation={null}>
            {activeItem ? (
              <div>
                <Item item={activeItem} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
};

export { ItemDndContext };
