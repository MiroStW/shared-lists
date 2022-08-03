import styles from "../../styles/item.module.css";
import { Item as ItemType } from "../../types/types";

const Item = ({ item }: { item: ItemType }) => {
  return <div className={styles.item}>{item.data.name}</div>;
};

export { Item };
