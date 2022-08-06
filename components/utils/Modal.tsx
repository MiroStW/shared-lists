import { Dispatch, ReactElement, SetStateAction } from "react";
import styles from "../../styles/modal.module.css";
import { Icon } from "./Icon";

const Modal = ({
  children,
  setOpenModal,
  title,
}: {
  children: ReactElement;
  setOpenModal: Dispatch<SetStateAction<boolean>>;
  title?: string;
}) => {
  return (
    <>
      <div
        className={styles.backdrop}
        onClick={() => setOpenModal(false)}
      ></div>
      <div className={styles.modal}>
        <div className={styles.modalButtons}>
          <div
            className={styles.modalCloseButton}
            onClick={() => setOpenModal(false)}
          >
            <Icon iconName={"close"} />
          </div>
        </div>
        <div className={styles.modalContent}>
          {title && <div className={styles.modalTitle}>{title}</div>}
          {children}
        </div>
      </div>
    </>
  );
};

export { Modal };
