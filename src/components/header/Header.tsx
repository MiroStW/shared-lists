import styles from "../../styles/header.module.css";
import { UserMenu } from "./UserMenu";

const Header = () => {
  return (
    <div id={styles.header}>
      <div className="mobileMenu"></div>
      <div className={styles.headerTitle}>
        <h1>shared-list</h1>
      </div>
      <UserMenu />
    </div>
  );
};

export { Header };
