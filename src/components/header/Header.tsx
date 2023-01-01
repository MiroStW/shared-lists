import { Dispatch, SetStateAction } from "react";
import styles from "../../styles/header.module.css";
import { MobileMenu } from "./MobileMenu";
import { UserMenu } from "./UserMenu";

const Header = ({
  showMobileLists,
  setShowMobileLists,
}: {
  showMobileLists: boolean;
  setShowMobileLists: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <div id={styles.header}>
      <MobileMenu
        showMobileLists={showMobileLists}
        setShowMobileLists={setShowMobileLists}
      />
      <div className={styles.headerTitle}>
        <h1>shared-list</h1>
      </div>
      <UserMenu />
    </div>
  );
};

export { Header };
