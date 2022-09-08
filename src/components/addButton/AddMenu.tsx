import { Dispatch, SetStateAction, useState } from "react";
import styles from "../../styles/addMenu.module.css";
import modalStyles from "../../styles/modal.module.css";
import { List } from "../../types/types";
import { AddNamePicker } from "./AddNamePicker";
import { Icon } from "../utils/Icon";

const AddMenu = ({
  setShowAddMenu,
  activeList,
}: {
  setShowAddMenu: Dispatch<SetStateAction<boolean>>;
  activeList: List;
}) => {
  const [type, setType] = useState<"item" | "section" | "list" | null>(null);

  return (
    <>
      {type ? (
        <AddNamePicker
          type={type}
          activeList={activeList}
          setShowAddMenu={setShowAddMenu}
        />
      ) : (
        <>
          <div
            className={modalStyles.backdrop}
            onClick={() => setShowAddMenu(false)}
          ></div>
          <div className={`${styles.addMenu} ${modalStyles.modal}`}>
            <div
              className={styles.addMenuItem}
              onClick={() => {
                setType("item");
              }}
            >
              <Icon iconName="add" style="filled" size={36} />
              <div className={styles.addMenuTitle}>New item</div>
            </div>
            <div
              className={styles.addMenuItem}
              onClick={() => {
                setType("section");
              }}
            >
              <Icon iconName="expand_more" style="filled" size={36} />
              <div className={styles.addMenuTitle}>New section</div>
            </div>
            <div
              className={styles.addMenuItem}
              onClick={() => {
                setType("list");
              }}
            >
              <Icon iconName="playlist_add" style="filled" size={36} />
              <div className={styles.addMenuTitle}>New list</div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export { AddMenu };
