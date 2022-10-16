import Link from "next/link";
import { useState } from "react";
import { List as ListType } from "../../types/types";
import styles from "../../styles/list.module.css";
import { Icon } from "../utils/Icon";

const List = ({ list }: { list: ListType }) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Link href={`/lists/${list.ref.id}`}>
      <div
        className={`${styles.list} ${isHovering ? styles.hover : ""}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className={styles.listTitle}>{list.data.name}</div>
        {isHovering && (
          <div className={styles.listMenu}>
            <Icon iconName={"edit"} />
            <Icon iconName={"delete"} />
          </div>
        )}
      </div>
    </Link>
  );
};

export default List;
