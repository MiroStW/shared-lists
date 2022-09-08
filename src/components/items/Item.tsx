import { deleteDoc } from "firebase/firestore";
import styles from "../../styles/item.module.css";
import { Item as ItemType } from "../../types/types";
import { Icon } from "../utils/Icon";
import { Checkbox } from "./Checkbox";
import { Sortable } from "../utils/Sortable";

const Item = ({ item }: { item: ItemType }) => {
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
          <div {...listeners} {...attributes} className={styles.itemName}>
            {item.data.name}
          </div>
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
