import { getAuth } from "firebase/auth";
import { getDocs, orderBy, query, where } from "firebase/firestore";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AddButton } from "../../components/addButton/AddButton";
import { Header } from "../../components/header/Header";
import { ItemAreaContainer } from "../../components/items/ItemAreaContainer";
import { Lists } from "../../components/lists/Lists";
import { Loading } from "../../components/utils/Loading";
import { firebase } from "../../firebase/firebase";
import { listConverter } from "../../firebase/firestoreConverter";
import { useLists } from "../../firebase/listsContext";
import { lists as listsRef } from "../../firebase/useDb";
import styles from "../../styles/showApp.module.css";
import { List } from "../../types/types";
import { RouteProps } from "../_app";

const ShowApp = () =>
  // { ssrLists }: { ssrLists: List[] }
  {
    const router = useRouter();
    const { id } = router.query;
    const { lists, loading } = useLists();
    const [list, setList] = useState<List | undefined>(undefined);

    // useEffect(() => {
    //   if (ssrLists) console.log("ssrLists: ", ssrLists);
    // }, [ssrLists]);

    useEffect(() => {
      if (!loading && lists) setList(lists?.find((el) => id === el.ref.id));
    }, [id, lists, loading]);

    return (
      <div id={styles.container}>
        <Header />
        <div id={styles.main}>
          {loading ? (
            <Loading />
          ) : (
            <>
              <Lists />
              {list ? <ItemAreaContainer list={list} /> : <Loading />}
              {list && <AddButton activeList={list} />}
            </>
          )}
        </div>
      </div>
    );
  };

export const getStaticProps: GetStaticProps = async () => {
  // const user = getAuth(firebase).currentUser;

  // const listsSnapshot = await getDocs(
  //   query(
  //     listsRef,
  //     where("ownerID", "==", user?.uid),
  //     where("isArchived", "==", false),
  //     orderBy("createdDate", "asc")
  //   ).withConverter(listConverter)
  // );

  // const ssrLists = listsSnapshot.docs.map((doc) => doc.data());

  return {
    props: {
      protectedRoute: true,
      // ssrLists,
    },
  };
};

// works like SSR on intiial load, then loads statically generated page
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export default ShowApp;
