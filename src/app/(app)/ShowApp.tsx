"use client";

import { Header } from "app/(app)/header/Header";
import { Lists } from "app/(app)/lists/[id]/lists/Lists";
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

  // TODO potentially use state library for showMobileLists to make this a RSC
  return (
    <>
      <div id={styles.container}>
        <Header
          showMobileLists={showMobileLists}
          setShowMobileLists={setShowMobileLists}
        />
        <div id={styles.main}>
          <ListsContextProvider>
            <Lists
              preFetchedLists={prefetchedLists}
              showMobileLists={showMobileLists}
              setShowMobileLists={setShowMobileLists}
            />
          </ListsContextProvider>
          <div className={`${styles.itemsArea} hoverScrollbar`}>{children}</div>
        </div>
      </div>
    </>
  );
};

export default ShowApp;
