"use client";

import { useState } from "react";
import { AddButton } from "../../../components/addButton/AddButton";
import { Header } from "../../../components/header/Header";
import { ItemDndContext } from "../../../components/items/ItemDndContext";
import { Lists } from "../../../components/lists/Lists";
import { AdminList } from "../../../types/types";
import { ItemsContextProvider } from "../../context/itemsContext";
import styles from "./showApp.module.css";

const ShowApp = ({
  activeList,
  prefetchedLists,
}: {
  activeList: AdminList;
  prefetchedLists: AdminList[];
}) => {
  const [showMobileLists, setShowMobileLists] = useState(false);

  return (
    <div id={styles.container}>
      <Header
        showMobileLists={showMobileLists}
        setShowMobileLists={setShowMobileLists}
      />
      <div id={styles.main}>
        <Lists
          preFetchedLists={prefetchedLists}
          showMobileLists={showMobileLists}
          setShowMobileLists={setShowMobileLists}
        />
        <div className={styles.itemsArea}>
          <ItemsContextProvider list={activeList}>
            <ItemDndContext list={activeList} />
            <AddButton activeList={activeList} />
          </ItemsContextProvider>
        </div>
      </div>
    </div>
  );
};

export default ShowApp;
