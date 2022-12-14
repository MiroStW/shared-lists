import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AddButton } from "../../components/addButton/AddButton";
import { Header } from "../../components/header/Header";
import { ItemDndContext } from "../../components/items/ItemDndContext";
import { Lists } from "../../components/lists/Lists";
import { Loading } from "../../components/utils/Loading";
import { useAuth } from "../../firebase/authContext";
import { adminDb } from "../../firebase/firebaseAdmin";
import { ItemsContextProvider } from "../../firebase/itemsContext";
import { verifyAuthToken } from "../../firebase/verifyAuthToken";
import styles from "../../styles/showApp.module.css";
import { AdminList } from "../../types/types";

// TODO: also prerender items/sections of list with id param

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { user } = await verifyAuthToken(ctx);

  if (user) {
    const ownedLists = adminDb()
      .collection("lists")
      .where("ownerID", "==", user.uid)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      // .withConverter(listConverter)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          return [];
        }
        return snapshot.docs.map(
          (doc) =>
            ({
              data: doc.data(),
              ref: {
                ...doc.ref,
                id: doc.id,
                parent: {
                  ...doc.ref.parent,
                  id: doc.ref.parent.id,
                },
                path: doc.ref.path,
              },
            } as AdminList)
        );
        // QUESTION: is there a better way to add getter functions like doc.id
        // to the ref? Without this, the getter functions are stripped away by JSON.stringify
      });

    const joinedLists = adminDb()
      .collection("lists")
      .where("contributors", "array-contains", user.uid)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      // .withConverter(listConverter)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          return [];
        }
        return snapshot.docs.map(
          (doc) =>
            ({
              data: doc.data(),
              ref: { ...doc.ref, id: doc.id },
            } as AdminList)
        );
      });

    const lists = await Promise.all([ownedLists, joinedLists]).then((values) =>
      values.flat()
    );

    return {
      props: {
        serializedLists: JSON.stringify(lists),
      },
    };
  } else
    return {
      redirect: {
        permanent: false,
        destination: "/login",
      },
      props: {} as never,
    };
};

const ShowList = ({
  serializedLists,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [lists, setLists] = useState<AdminList[] | null>(null);
  const [activeList, setActiveList] = useState<AdminList | undefined>(
    undefined
  );
  const [showMobileLists, setShowMobileLists] = useState(false);

  useEffect(() => {
    if (serializedLists) {
      const preFetchedLists = JSON.parse(serializedLists) as AdminList[];
      const foundActiveList = preFetchedLists.find(
        (list) => list.ref.id === id
      );
      if (!foundActiveList) {
        router.push("/lists");
      } else {
        setActiveList(foundActiveList);
      }
      setLists(preFetchedLists);
    }
  }, [id, router, serializedLists]);

  return (
    <div id={styles.container}>
      <Header
        showMobileLists={showMobileLists}
        setShowMobileLists={setShowMobileLists}
      />
      <div id={styles.main}>
        <Lists
          preFetchedLists={lists || undefined}
          showMobileLists={showMobileLists}
          setShowMobileLists={setShowMobileLists}
        />
        <div className={styles.itemsArea}>
          {activeList && user ? (
            <ItemsContextProvider list={activeList}>
              <ItemDndContext list={activeList} />
              <AddButton activeList={activeList} />
            </ItemsContextProvider>
          ) : (
            <Loading />
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowList;
