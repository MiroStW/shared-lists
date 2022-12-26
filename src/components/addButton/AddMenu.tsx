import { Dispatch, SetStateAction, useState } from "react";
import { doc } from "firebase/firestore";
import styles from "../../styles/addMenu.module.css";
import modalStyles from "../../styles/modal.module.css";
import { AdminList, List } from "../../types/types";
import { AddNamePicker } from "./AddNamePicker";
import { Icon } from "../utils/Icon";
import { useItems } from "../../firebase/itemsContext";
import { createItemData } from "../../firebase/factory";
import { db } from "../../firebase/useDb";

const AddMenu = ({
  setShowAddMenu,
  activeList,
}: {
  setShowAddMenu: Dispatch<SetStateAction<boolean>>;
  activeList: AdminList;
}) => {
  const [type, setType] = useState<"item" | "section" | "list" | null>(null);
  const { localItems, setLocalItems } = useItems();

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
                setLocalItems((prev) => ({
                  ...prev,
                  [activeList.ref.id]: [
                    ...prev[activeList.ref.id],
                    {
                      ref: doc(
                        db,
                        `lists/${activeList.ref.id}/items`,
                        "newItem"
                      ),
                      data: createItemData({
                        name: "",
                        authorizedUsers: activeList.data.contributors
                          ? [
                              activeList.data.ownerID,
                              ...activeList.data.contributors,
                            ]
                          : [activeList.data.ownerID],
                        list: activeList,
                        order: localItems[activeList.ref.id].length,
                      }),
                    },
                  ],
                }));
                setShowAddMenu(false);
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
