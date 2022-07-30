import { Header } from "../components/header/Header";
import { Items } from "../components/items/Items";
import { Lists } from "../components/lists/Lists";
import styles from "../styles/showApp.module.css";

const ShowApp = () => {
  return (
    <div>
      <Header />
      <div id={styles.main}>
        <Lists />
        <Items />
      </div>
    </div>
  );
};

export default ShowApp;
