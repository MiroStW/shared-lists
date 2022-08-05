import { useState } from "react";
import { Icon } from "./Icon";
import styles from "../styles/addButton.module.css";
import { AddMenu } from "./AddMenu";

const AddButton = () => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <>
      {showAddMenu ? (
        <AddMenu setShowAddMenu={setShowAddMenu} />
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
