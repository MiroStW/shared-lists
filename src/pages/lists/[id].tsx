import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AddButton } from "../../components/addButton/AddButton";
import { Header } from "../../components/header/Header";
import { ItemAreaContainer } from "../../components/items/ItemAreaContainer";
import { Lists } from "../../components/lists/Lists";
import { Loading } from "../../components/utils/Loading";
import { useLists } from "../../firebase/listsContext";
import styles from "../../styles/showApp.module.css";
import { List } from "../../types/types";

const ShowList = () => {
  const router = useRouter();
  const { id } = router.query;
  const [list, setList] = useState<List | undefined>(undefined);
  const { lists, loading: loadingLists } = useLists();

  useEffect(() => {
    if (!loadingLists && lists) setList(lists?.find((el) => id === el.ref.id));
  }, [id, lists, loadingLists]);

  if (loadingLists) return <Loading />;

  return (
    <div id={styles.container}>
      <Header />
      <div id={styles.main}>
        {loadingLists ? (
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

export const getServerSideProps = async () => {
  return {
    props: { protectedRoute: true },
  };
};

export default ShowList;
