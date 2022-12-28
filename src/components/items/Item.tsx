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
  const { deleteLocalItem, addLocalItem, localItems } = useItems();
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

  // when pressing enter on an empty item, dont create a new item
  // TODO: new temp item created at end of list, not under current item
  // currently creates new item at end of list, but when saving, it saves under
  // current item without updating order of following items
  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (itemName !== "") {
      console.log("this ENTER came from item: ", item, localItems);

      addLocalItem(
        Math.min(
          item.data.order + 1,
          localItems[item.ref.parent.parent!.id].length
        )
      );
    }
  };

  const submitEdit = (
    e: KeyboardEvent<HTMLInputElement> | FocusEvent<HTMLInputElement, Element>
  ) => {
    e.preventDefault();
    if (itemName !== item.data.name) {
      if (item.ref.id.startsWith("newItem")) {
        console.log("delete local item after adding item to db: ", item.ref.id);
        addDoc(item.ref.parent, { ...item.data, name: itemName });
        // update order of following items
        localItems[item.ref.parent.parent!.id]
          .slice(localItems[item.ref.parent.parent!.id].indexOf(item) + 1)
          .filter((i) => !i.ref.id.startsWith("newItem"))
          .forEach((i) => {
            updateDoc(i.ref, { order: i.data.order + 1 });
          });

        deleteLocalItem(item);
      } else {
        updateDoc(item.ref, { name: itemName });
      }
    }
    if (item.data.name === "") {
      deleteLocalItem(item);
    }
    setInlineEdit(false);
  };

  const handleDelete = () => {
    localItems[item.ref.parent.parent!.id]
      .slice(localItems[item.ref.parent.parent!.id].indexOf(item) + 1)
      .forEach((i) => {
        updateDoc(i.ref, { order: i.data.order - 1 });
      });
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
                if (e.key === "Enter") {
                  handleEnter(e);
                }
              }}
              onBlur={submitEdit}
            />
          ) : (
            <div
              {...listeners}
              {...attributes}
              className={styles.itemName}
              onClick={handleInlineEdit}
            >
              {item.data.order} - {item.data.name}
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
