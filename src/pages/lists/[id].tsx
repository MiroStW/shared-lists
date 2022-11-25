import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AddButton } from "../../components/addButton/AddButton";
import { Header } from "../../components/header/Header";
import { ItemAreaContainer } from "../../components/items/ItemAreaContainer";
import { Lists } from "../../components/lists/Lists";
import { Loading } from "../../components/utils/Loading";
import { useLists } from "../../firebase/listsContext";
import { verifyAuthToken } from "../../firebase/verifyAuthToken";
import styles from "../../styles/showApp.module.css";
import { List } from "../../types/types";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { serializedUser } = await verifyAuthToken(ctx);

  if (serializedUser)
    return {
      props: {
        serializedUser,
      },
    };
  else
    return {
      redirect: {
        permanent: false,
        destination: "/login",
      },
      props: {} as never,
    };
};

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

export default ShowApp;
