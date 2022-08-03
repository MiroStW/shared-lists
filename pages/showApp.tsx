import { User } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useDocumentOnce } from "react-firebase-hooks/firestore";
import { Header } from "../components/header/Header";
import { Items } from "../components/items/Items";
import { Lists } from "../components/lists/Lists";
import { auth, db } from "../firebase/firebase";
import { listConverter } from "../firebase/firestoreConverter";
import styles from "../styles/showApp.module.css";
import { List } from "../types/types";

const ShowApp = ({ user }: { user: User }) => {
  const [list, loading, error, reload] = useDocumentOnce(
    doc(db, "lists/ReVsf81YvgD7w0HnOVwz").withConverter(listConverter)
  );

  return (
    <div>
      <Header />
      <div id={styles.main}>
        <Lists user={user} />
        {list && <Items user={user} list={list?.data() as List} />}
        {/* get open list from route */}
      </div>
    </div>
  );
};

ShowApp.getInitialProps = async () => {
  const user = auth.currentUser?.uid;
  return user;
};

export default ShowApp;
