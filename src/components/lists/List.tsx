import Link from "next/link";
import { List as ListType } from "../../types/types";
import styles from "../../styles/list.module.css";

const List = ({ list }: { list: ListType }) => {
  return (
    <Link href={`/lists/${list.ref.id}`}>
      <div className={styles.list}>
        <div className={styles.listTitle}>{list.data.name}</div>
      </div>
    </Link>
  );
};

export default List;
