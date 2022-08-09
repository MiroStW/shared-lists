import styles from "../../styles/item.module.css";
import { Item as ItemType } from "../../types/types";
import { Checkbox } from "./Checkbox";

const Item = ({ item }: { item: ItemType }) => {
  return (
    <div className={`${styles.item} ${item.data.completed && styles.complete}`}>
      <Checkbox item={item} />
      <div className={styles.itemName}>{item.data.name}</div>
    </div>
  );
};

export { Item };
