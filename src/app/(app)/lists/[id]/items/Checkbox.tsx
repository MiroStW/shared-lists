"use client";

import { Item } from "types/types";
import styles from "./item.module.css";
import { useRouter } from "next/navigation";

const Checkbox = ({ item }: { item: Item }) => {
  const router = useRouter();
  const handleCompleted = async () => {
    await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.data.completed }),
    });
    router.refresh();
  };

  return (
    <div className={styles.checkbox} onClick={handleCompleted}>
      <input
        className={styles.itemComplete}
        type="checkbox"
        name="completed"
        id={`checkbox-${item.id}`}
        checked={item.data.completed}
        readOnly
      />
      <label className="material-icons" htmlFor={`checkbox-${item.id}`}>
        {item.data.completed && "done"}
      </label>
    </div>
  );
};

export { Checkbox };
