"use client";

import { Header } from "app/(app)/header/Header";
import { Lists } from "app/(app)/lists/[id]/lists/Lists";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminList } from "types/types";
import { ListsContextProvider } from "./listsContext";
import styles from "./showApp.module.css";
import { useClientSession } from "app/sessionContext";

const ShowApp = ({
  prefetchedLists,
  children,
}: {
  prefetchedLists?: AdminList[];
  children: React.ReactNode;
}) => {
  const [showMobileLists, setShowMobileLists] = useState(false);
  const { user, isLoading } = useClientSession();
  const router = useRouter();

  useEffect(() => {
    if (!user && !isLoading) router.push("/signin");
  }, [isLoading, router, user]);
  // TODO potentially use state library for showMobileLists to make this a RSC
  return (
    <div id={styles.container}>
      <Header
        showMobileLists={showMobileLists}
        setShowMobileLists={setShowMobileLists}
      />
      <div
        id={styles.main}
        className={`${showMobileLists && styles.showMobileLists}`}
      >
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
  );
};

export default ShowApp;
