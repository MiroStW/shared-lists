import { List as ListType } from "../../types/types";
import styles from "../../styles/list.module.css";

const List = ({ list }: { list: ListType }) => {
  return (
    <div className={styles.list}>
      <div className={styles.listTitle}>{list.data.name}</div>
    </div>
  );
};

export default List;
