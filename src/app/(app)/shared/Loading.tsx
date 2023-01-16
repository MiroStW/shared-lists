import styles from "./loading.module.css";

const Loading = ({
  size = 80,
  inline = false,
}: {
  size?: 80 | 60 | 40 | 20;
  inline?: boolean;
}) => {
  return (
    <div
      className={`${styles.loader} ${styles[`size${size}`]} ${
        !inline && styles.center
      }`}
    >
      <div className="loading__spinner"></div>
      <div className="loading__spinner-inner"></div>
    </div>
  );
};

export { Loading };
