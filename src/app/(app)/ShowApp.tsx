"use client";

import { Header } from "components/header/Header";
import { Lists } from "components/lists/Lists";
import { useState } from "react";
import { AdminList } from "types/types";
import { ListsContextProvider } from "./listsContext";
import styles from "./showApp.module.css";

const ShowApp = ({
  prefetchedLists,
  children,
}: {
  prefetchedLists: AdminList[];
  children: React.ReactNode;
}) => {
  const [showMobileLists, setShowMobileLists] = useState(false);

  return (
    <>
      <ListsContextProvider>
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
            <div className={styles.itemsArea}>{children}</div>
          </div>
        </div>
      </ListsContextProvider>
    </>
  );
};

export default ShowApp;
