import { deleteDoc, updateDoc } from "firebase/firestore";
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "../../styles/item.module.css";
import { Item as ItemType } from "../../types/types";
import { Icon } from "../utils/Icon";
import { Checkbox } from "./Checkbox";
import { Sortable } from "../utils/Sortable";

const Item = ({ item }: { item: ItemType }) => {
  const [inlineEdit, setInlineEdit] = useState(false);
  const [itemName, setItemName] = useState(item.data.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineEdit) inputRef.current?.focus();
  }, [inlineEdit]);

  const handleInlineEdit = () => {
    setInlineEdit(true);
  };

  const handleRename = (e: ChangeEvent<HTMLInputElement>) => {
    setItemName(e.target.value);
  };

  const handleRenameSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (itemName !== item.data.name) {
      updateDoc(item.ref, { name: itemName });
    }
    setInlineEdit(false);
  };

  const handleDelete = () => {
    deleteDoc(item.ref);
  };

  return (
    <Sortable
      item={item}
      render={(listeners, attributes) => (
        <div
          className={`${styles.item} ${
            item.data.completed ? styles.complete : ""
          }`}
        >
          <Checkbox item={item} />
          {inlineEdit ? (
            <input
              ref={inputRef}
              type="text"
              value={itemName}
              className={styles.itemName}
              onChange={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit(e);
              }}
            />
          ) : (
            <div
              {...listeners}
              {...attributes}
              className={styles.itemName}
              onClick={handleInlineEdit}
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
