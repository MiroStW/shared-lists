import { updateDoc } from "firebase/firestore";
import { Item } from "types/types";
import styles from "./item.module.css";

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
