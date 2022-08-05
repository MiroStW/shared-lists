import { Dispatch, SetStateAction } from "react";
import styles from "../styles/addMenu.module.css";
import { Icon } from "./Icon";

const AddMenu = ({
  setShowAddMenu,
}: {
  setShowAddMenu: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <div className={styles.backdrop} onClick={() => setShowAddMenu(false)}>
      <div className={styles.addMenu}>
        <div
          className={styles.addMenuItem}
          onClick={() => setShowAddMenu(false)}
        >
          <Icon iconName="add" style="filled" size={36} />
          <div className={styles.addMenuTitle}>New item</div>
        </div>
        <div
          className={styles.addMenuItem}
          onClick={() => setShowAddMenu(false)}
        >
          <Icon iconName="expand_more" style="filled" size={36} />
          <div className={styles.addMenuTitle}>New section</div>
        </div>
        <div
          className={styles.addMenuItem}
          onClick={() => setShowAddMenu(false)}
        >
          <Icon iconName="playlist_add" style="filled" size={36} />
          <div className={styles.addMenuTitle}>New list</div>
        </div>
      </div>
    </div>
  );
};

export { AddMenu };
