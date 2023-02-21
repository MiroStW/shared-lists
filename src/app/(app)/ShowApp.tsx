"use client";

import { Header } from "app/(app)/header/Header";
import { Lists } from "app/(app)/lists/[id]/lists/Lists";
import { useAuth } from "app/authContext";
import { Loading } from "app/shared/Loading";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminList } from "types/types";
import { ListsContextProvider } from "./listsContext";
import styles from "./showApp.module.css";

const ShowApp = ({
  prefetchedLists,
  children,
}: {
  prefetchedLists?: AdminList[];
  children: React.ReactNode;
}) => {
  const [showMobileLists, setShowMobileLists] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [router, user]);
  // TODO potentially use state library for showMobileLists to make this a RSC
  return (
    <>
      {loading ? (
        <Loading />
      ) : (
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
            <div className={`${styles.itemsArea} hoverScrollbar`}>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShowApp;
