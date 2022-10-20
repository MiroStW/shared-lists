import { useState } from "react";
import styles from "../../styles/section.module.css";
import { Section } from "../../types/types";
import { DeleteModal } from "../lists/DeleteModal";
import { RenameModal } from "../lists/RenameModal";
import { Icon } from "../utils/Icon";

const SectionHeader = ({ section }: { section: Section }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showRenameModual, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <div className={styles.sectionHeader}>
        <div
          className={styles.sectionToggle}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Icon iconName={isOpen ? "unfold_less" : "unfold_more"} size={24} />
        </div>
        <div className={styles.sectionName}>{section.data.name}</div>
        <div className={styles.sectionHoverMenu}>
          <div
            className={styles.renameButton}
            onClick={() => setShowRenameModal(true)}
          >
            <Icon iconName="edit" />
          </div>
          <div
            className={styles.deleteButton}
            onClick={() => setShowDeleteModal(true)}
          >
            <Icon iconName="delete" />
          </div>
        </div>
      </div>

      {showRenameModual && (
        <RenameModal collection={section} setShowModal={setShowRenameModal} />
      )}
      {showDeleteModal && (
        <DeleteModal collection={section} setShowModal={setShowDeleteModal} />
      )}
    </>
  );
};

export { SectionHeader };
