"use client";

import {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useItems } from "app/(app)/lists/[id]/itemsContext";
import { Item as ItemType } from "types/types";
import { Icon } from "app/shared/Icon";
import styles from "./item.module.css";
import { Sortable } from "./dnd/Sortable";
import Checkbox from "@mui/material/Checkbox";
import { TextareaAutosize } from "@mui/material";

const Item = ({ item, focus = false }: { item: ItemType; focus?: boolean }) => {
  const [inlineEdit, setInlineEdit] = useState(false);
  const [itemName, setItemName] = useState(item.data.name);
  const { deleteLocalItem, addLocalItem, localItems, refreshItems } = useItems();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inlineEdit || focus) {
      textareaRef.current?.focus();
    }
  }, [focus, inlineEdit, itemName.length]);

  const handleInlineEdit = () => {
    setInlineEdit(true);
  };

  const handleRename = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setItemName(e.target.value);
  };

  // Defocus current item, triggering submitEdit & create new empty item
  const handleEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    textareaRef.current?.blur();

    if (itemName !== "") {
      const containerId = item.data.sectionID || item.data.listID;
      addLocalItem({
        order: Math.min(
          item.data.order + 1,
          localItems[containerId]?.length || 0,
        ),
        sectionId: item.data.sectionID || undefined,
      });
    }
  };

  const submitEditOnBlur = async (
    e:
      | KeyboardEvent<HTMLTextAreaElement>
      | FocusEvent<HTMLTextAreaElement, Element>,
  ) => {
    e.preventDefault();
    if (itemName !== item.data.name) {
      if (item.id.startsWith("newItem_")) {
        // Create new item
        const response = await fetch(`/api/lists/${item.data.listID}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: itemName,
            sectionID: item.data.sectionID,
            order: item.data.order,
          }),
        });
        if (response.ok) {
          refreshItems();
          deleteLocalItem(item);
        }
      } else {
        // Update existing item
        await fetch(`/api/items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName }),
        });
        refreshItems();
      }
    }
    if (item.data.name === "" && itemName === "") {
      deleteLocalItem(item);
    }
    setInlineEdit(false);
  };

  const handleDelete = async () => {
    await fetch(`/api/items/${item.id}`, {
      method: "DELETE",
    });
    refreshItems();
  };

  const toggleComplete = async () => {
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.data.completed }),
    });
    refreshItems();
  };

  return (
    <Sortable
      item={item}
      render={(listeners, attributes) => (
        <div
          className={`${styles.item}${
            item.data.completed ? ` ${styles.complete}` : ""
          }`}
          id={item.id}
        >
          <Checkbox
            checked={item.data.completed}
            size="small"
            sx={{
              color: "white",
              "&.Mui-checked": {
                color: "grey",
              },
            }}
            onChange={toggleComplete}
          />
          {inlineEdit || focus ? (
            <TextareaAutosize
              maxRows={10}
              ref={textareaRef}
              value={itemName}
              className={styles.itemName}
              onChange={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEnter(e);
                }
              }}
              onBlur={submitEditOnBlur}
            />
          ) : (
            <div
              {...listeners}
              {...attributes}
              className={styles.itemName}
              onClick={handleInlineEdit}
              ref={divRef}
            >
              {item.data.name}
            </div>
          )}
          <div className={styles.itemHoverMenu}>
            <div className={styles.deleteButton} onClick={handleDelete}>
              <Icon iconName="delete" />
            </div>
          </div>
        </div>
      )}
    />
  );
};

export { Item };
