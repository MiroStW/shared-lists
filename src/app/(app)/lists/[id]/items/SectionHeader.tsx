import { useState } from "react";
import { Section } from "types/types";
import { DeleteModal } from "app/(app)/lists/[id]/lists/DeleteModal";
import { RenameModal } from "app/(app)/lists/[id]/lists/RenameModal";
import { Icon } from "app/shared/Icon";
import styles from "./section.module.css";

const SectionHeader = ({ section }: { section: Section }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [showRenameModual, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <div
        className={`${styles.sectionHeader} ${isHovering && styles.hover}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className={styles.sectionToggle}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Icon iconName={isOpen ? "unfold_less" : "unfold_more"} size={24} />
        </div>
        <div className={styles.sectionName}>{section.data.name}</div>
        {isHovering && (
          <div className={styles.sectionMenu}>
            <div onClick={() => setShowRenameModal(true)}>
              <Icon iconName="edit" />
            </div>
            <div onClick={() => setShowDeleteModal(true)}>
              <Icon iconName="delete" />
            </div>
          </div>
        )}
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
