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
  const { deleteLocalItem, addLocalItem, localItems, setLocalItems } =
    useItems();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineEdit || focus) inputRef.current?.focus();
  }, [focus, inlineEdit]);

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
    // 1. handleRename
    // 2. change id to "pending_..."?
    // 3. save to db
    // 4. defocus / blur
    inputRef.current?.blur(); // triggering 1.-3.
    // 5. add new item, which will grab focus next
    if (itemName !== "") {
      console.log("this ENTER came from item: ", item, localItems);

      addLocalItem(
        Math.min(
          item.data.order + 1,
          localItems[item.ref.parent.parent!.id].length
        )
      );

      // TODO: update local order here! needs to be reversed if item gets
      // deleted
      if (item.data.order < localItems[item.ref.parent.parent!.id].length - 1)
        setLocalItems((prev) => {
          return {
            ...prev,
            [item.ref.parent.parent!.id]: [
              ...prev[item.ref.parent.parent!.id].slice(
                0,
                localItems[item.ref.parent.parent!.id].indexOf(item) + 1
              ),
              prev[item.ref.parent.parent!.id].find((i) =>
                i.ref.id.startsWith("newItem")
              )!,
              ...prev[item.ref.parent.parent!.id]
                .slice(localItems[item.ref.parent.parent!.id].indexOf(item) + 1)
                .filter((i) => !i.ref.id.startsWith("newItem"))
                .map((i) => {
                  return {
                    ...i,
                    data: {
                      ...i.data,
                      order: i.data.order + 1,
                    },
                  };
                }),
            ],
          };
        });

      // localItems[item.ref.parent.parent!.id]
      //   .slice(localItems[item.ref.parent.parent!.id].indexOf(item) + 1)
      //   .filter((i) => !i.ref.id.startsWith("newItem"))
      //   .forEach((i) => {
      //     setLocalItems((prev) => {
      //       return {
      //         ...prev,
      //         [item.ref.parent.parent!.id]: [
      //           ...prev[item.ref.parent.parent!.id].map((i) => {
      //             if (i.ref.id !== item.ref.id) {
      //               return {
      //                 ...i,
      //                 data: {
      //                   ...i.data,
      //                   order: i.data.order + 1,
      //                 },
      //               };
      //             }
      //             return i;
      //           }),
      //         ],
      //       };
      //     }
      //   });
    }
  };

  // there is a race condition here, where the item is deleted before the new
  // item is added as they both grab focus
  // try to get back to only one newItem at a time
  // write newName to localItems onChange, and update id to "pending_..."
  // that takes away the auto-focus and leaves it only for real "newItem_" items

  const submitEdit = (
    e: KeyboardEvent<HTMLInputElement> | FocusEvent<HTMLInputElement, Element>
  ) => {
    // 1. handleRename
    // 2. change id to "pending_..."?
    // 3. save to db
    e.preventDefault();
    if (itemName !== item.data.name) {
      if (item.ref.id.startsWith("newItem")) {
        console.log("input blurred, write new name to db: ", itemName);
        // setLocalItems((prev) => {
        //   return {
        //     ...prev,
        //     [item.ref.parent.parent!.id]: [
        //       ...prev[item.ref.parent.parent!.id],
        //       {
        //         data: { ...item.data, name: itemName },
        //         ref: {
        //           ...item.ref,
        //           id: `pending_${item.ref.id}`,
        //           path: item.ref.path,
        //           parent: item.ref.parent,
        //           withConverter: item.ref.withConverter,
        //         },
        //       },
        //     ],
        //   };
        // });
        console.log("add item to db: ", item.ref.id);
        addDoc(item.ref.parent, { ...item.data, name: itemName });
        // 4. update order of following items
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
    if (item.data.name === "" && itemName === "") {
      deleteLocalItem(item);
      // reorder of following items
      if (item.data.order < localItems[item.ref.parent.parent!.id].length - 1)
        setLocalItems((prev) => {
          return {
            ...prev,
            [item.ref.parent.parent!.id]: [
              ...prev[item.ref.parent.parent!.id].slice(
                0,
                localItems[item.ref.parent.parent!.id].indexOf(item)
              ),
              ...prev[item.ref.parent.parent!.id]
                .slice(localItems[item.ref.parent.parent!.id].indexOf(item))
                .map((i) => {
                  return {
                    ...i,
                    data: {
                      ...i.data,
                      order: i.data.order - 1,
                    },
                  };
                }),
            ],
          };
        });
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
