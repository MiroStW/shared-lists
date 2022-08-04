import styles from "../styles/loading.module.css";

const Loading = () => {
  return (
    <div className={styles.loader}>
      <div className="loading__spinner"></div>
      <div className="loading__spinner-inner"></div>
    </div>
  );
};

export { Loading };
