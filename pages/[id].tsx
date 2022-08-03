import { Header } from "../components/header/Header";
import { Items } from "../components/items/Items";
import { Lists } from "../components/lists/Lists";
import { useLists } from "../firebase/listsContext";
import styles from "../styles/showApp.module.css";

const ShowApp = ({ id }: { id: string }) => {
  const { lists } = useLists();

  const list = lists?.find((el) => id === el.ref.id);

  // const [list, loading, error, reload] = useDocumentOnce(
  //   doc(db, "lists/ReVsf81YvgD7w0HnOVwz").withConverter(listConverter)
  // );

  return (
    <div>
      <Header />
      <div id={styles.main}>
        <Lists />
        {list && <Items list={list} />}
        {/* get open list from route */}
      </div>
    </div>
  );
};

// ShowApp.getInitialProps = async () => {
//   const user = auth.currentUser?.uid;
//   return user;
// };

export default ShowApp;
