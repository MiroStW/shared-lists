import { useState } from "react";
import { Icon } from "../utils/Icon";
import styles from "../../styles/addButton.module.css";
import { AddMenu } from "./AddMenu";
import { AdminList, List } from "../../types/types";

const AddButton = ({ activeList }: { activeList: AdminList }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <>
      {showAddMenu ? (
        <AddMenu setShowAddMenu={setShowAddMenu} activeList={activeList} />
      ) : (
        <button
          className={styles.addButton}
          onClick={() => setShowAddMenu(true)}
        >
          <Icon iconName="add" style="filled" size={36} />
        </button>
      )}
    </>
  );
};

export { AddButton };
