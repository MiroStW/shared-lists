import styles from "../../styles/loading.module.css";

const Loading = ({ size = 80 }: { size?: 80 | 60 | 40 | 20 }) => {
  return (
    <div className={`${styles.loader} ${styles[`size${size}`]}`}>
      <div className="loading__spinner"></div>
      <div className="loading__spinner-inner"></div>
    </div>
  );
};

export { Loading };
