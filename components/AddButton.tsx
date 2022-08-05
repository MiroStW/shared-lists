import { Icon } from "./Icon";
import styles from "../styles/addButton.module.css";

const AddButton = () => {
  return (
    <button className={styles.addButton}>
      <Icon iconName="add" style="filled" size={36} />
    </button>
  );
};

export { AddButton };
