"use client";

import { Icon } from "app/shared/Icon";
import { useState } from "react";
import { AdminList } from "types/types";
import styles from "./addButton.module.css";
import { AddMenu } from "./AddMenu";

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
