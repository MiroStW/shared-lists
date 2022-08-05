import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Header } from "../../components/header/Header";
import { Items } from "../../components/items/Items";
import { Lists } from "../../components/lists/Lists";
import { Loading } from "../../components/Loading";
import { useLists } from "../../firebase/listsContext";
import styles from "../../styles/showApp.module.css";
import { List } from "../../types/types";

const ShowApp = () => {
  const router = useRouter();
  const { id } = router.query;
  const [list, setList] = useState<List | undefined>(undefined);
  const { lists, loading: loadingLists } = useLists();

  useEffect(() => {
    console.log(id);
    if (!loadingLists && lists) setList(lists?.find((el) => id === el.ref.id));
  }, [id, lists]);

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
            <div style={{ position: "relative", flex: 1 }}>
              {list ? <Items list={list} /> : <Loading />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ShowApp.getInitialProps = async () => {
//   const user = auth.currentUser?.uid;
//   return user;
// };

export default ShowApp;
