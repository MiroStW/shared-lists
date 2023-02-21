import { addDoc, deleteDoc, updateDoc } from "firebase/firestore";
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
import TextareaAutosize from "@mui/base/TextareaAutosize";
import styles from "./item.module.css";
import { Sortable } from "./dnd/Sortable";
import Checkbox from "@mui/material/Checkbox";

const Item = ({ item, focus = false }: { item: ItemType; focus?: boolean }) => {
  const [inlineEdit, setInlineEdit] = useState(false);
  const [itemName, setItemName] = useState(item.data.name);
  const { deleteLocalItem, addLocalItem, localItems } = useItems();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inlineEdit || focus) {
      textareaRef.current?.focus();
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(-1, -1);
        textareaRef.current?.scrollIntoView({
          block: "end",
          inline: "nearest",
          behavior: "smooth",
        });
      }, 0);
    }
    // else {
    //   setTimeout(() => {
    //     divRef.current?.scrollIntoView();
    //   }, 0);
    // }
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
      addLocalItem({
        order: Math.min(
          item.data.order + 1,
          localItems[item.ref.parent.parent!.id].length
        ),
        sectionId: item.ref.parent.parent!.id,
      });
    }
  };

  const submitEditOnBlur = (
    e:
      | KeyboardEvent<HTMLTextAreaElement>
      | FocusEvent<HTMLTextAreaElement, Element>
  ) => {
    e.preventDefault();
    // only update if name has changed
    if (itemName !== item.data.name) {
      // if item is new, add it to db, otherwise update existing one
      if (item.ref.id.startsWith("newItem")) {
        addDoc(item.ref.parent, { ...item.data, name: itemName });
        // update order of following items
        localItems[item.ref.parent.parent!.id]
          .slice(localItems[item.ref.parent.parent!.id].indexOf(item) + 1)
          .filter((i) => !i.ref.id.startsWith("newItem"))
          .forEach((i) => {
            updateDoc(i.ref, { order: i.data.order + 1 });
          });
        // delete local item, it will be re-added from db
        deleteLocalItem(item);
      } else {
        updateDoc(item.ref, { name: itemName });
      }
    }
    if (item.data.name === "" && itemName === "") {
      // delete item if it was & stays empty
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
          className={`${styles.item}${
            item.data.completed ? ` ${styles.complete}` : ""
          }`}
          id={item.ref.id}
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
            onChange={() =>
              updateDoc(item.ref, { completed: !item.data.completed })
            }
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
