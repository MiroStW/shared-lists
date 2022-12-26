import { addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "../../styles/item.module.css";
import { Item as ItemType } from "../../types/types";
import { Icon } from "../utils/Icon";
import { Checkbox } from "./Checkbox";
import { Sortable } from "../utils/Sortable";
import { useItems } from "../../firebase/itemsContext";

const Item = ({ item, focus = false }: { item: ItemType; focus?: boolean }) => {
  const [inlineEdit, setInlineEdit] = useState(false);
  const [itemName, setItemName] = useState(item.data.name);
  const { setLocalItems } = useItems();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineEdit || focus) inputRef.current?.focus();
  }, [focus, inlineEdit, item.ref.id]);

  const handleInlineEdit = () => {
    setInlineEdit(true);
  };

  const handleRename = (e: ChangeEvent<HTMLInputElement>) => {
    setItemName(e.target.value);
  };

  const handleRenameSubmit = (
    e: KeyboardEvent<HTMLInputElement> | FocusEvent<HTMLInputElement, Element>
  ) => {
    e.preventDefault();
    if (itemName !== item.data.name) {
      if (item.ref.id === "newItem") {
        addDoc(item.ref.parent, { ...item.data, name: itemName });
      } else {
        updateDoc(item.ref, { name: itemName });
      }
    } else if (item.ref.id === "newItem") {
      // delete item from localItems if name is empty
      setLocalItems((prev) => {
        return {
          ...prev,
          [item.ref.parent.parent!.id]: prev[item.ref.parent.parent!.id].filter(
            (i) => i.ref.id !== item.ref.id
          ),
        };
      });
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
          id={item.ref.id}
        >
          <Checkbox item={item} />
          {inlineEdit || focus ? (
            <input
              ref={inputRef}
              type="text"
              value={itemName}
              className={styles.itemName}
              onChange={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit(e);
              }}
              onBlur={handleRenameSubmit}
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
