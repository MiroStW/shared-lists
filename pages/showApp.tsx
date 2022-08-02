import { User } from "firebase/auth";
import { Header } from "../components/header/Header";
import { Items } from "../components/items/Items";
import { Lists } from "../components/lists/Lists";
import { auth } from "../firebase/firebase";
import styles from "../styles/showApp.module.css";

const ShowApp = ({ user }: { user: User }) => {
  return (
    <div>
      <Header />
      <div id={styles.main}>
        <Lists user={user} />
        <Items />
      </div>
    </div>
  );
};

ShowApp.getInitialProps = async () => {
  const user = auth.currentUser?.uid;
  return user;
};

export default ShowApp;
