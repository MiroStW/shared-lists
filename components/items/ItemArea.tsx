import styles from "../../styles/items.module.css";
import { List } from "../../types/types";
import { Items } from "./Items";
import { Sections } from "./Sections";

const ItemArea = ({ list }: { list: List }) => {
  return (
    <div className={styles.itemsArea}>
      <div className={styles.itemsHeader}>
        <h2>{list.data.name}</h2>
      </div>
      <div className={styles.itemsList}>
        <Items parent={list} />
        <Sections list={list} />
      </div>
    </div>
  );
};

export { ItemArea };
