import { updateDoc } from "firebase/firestore";
import styles from "../../styles/item.module.css";
import { Item } from "../../types/types";

const Checkbox = ({ item }: { item: Item }) => {
  const handleCompleted = () => {
    updateDoc(item.ref, { completed: !item.data.completed });
  };

  return (
    <div className={styles.checkbox} onClick={handleCompleted}>
      <input
        className={styles.itemComplete}
        type="checkbox"
        name="completed"
        id={`checkbox-${item.ref.id}`}
        defaultChecked={item.data.completed}
      />
      <label className="material-icons" htmlFor={`checkbox-${item.ref.id}`}>
        {item.data.completed && "done"}
      </label>
    </div>
  );
};

export { Checkbox };
