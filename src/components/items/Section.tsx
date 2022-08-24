import { useState } from "react";
import styles from "../../styles/section.module.css";
import { Section as SectionType } from "../../types/types";
import { Droppable } from "../utils/Droppable";
import { Icon } from "../utils/Icon";
import { Items } from "./Items";

const Section = ({ section }: { section: SectionType }) => {
  const [isOpen, setIsOpen] = useState(true);
  const handleDelete = () => {
    console.log("click");
  };

  return (
    <div className={styles.section}>
      {/* <Droppable area={section} type={"section-header"}> */}
      <div className={styles.sectionHeader}>
        <div
          className={styles.sectionToggle}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Icon iconName={isOpen ? "unfold_less" : "unfold_more"} size={24} />
        </div>
        <div className={styles.sectionName}>{section.data.name}</div>
        <div className={styles.sectionHoverMenu}>
          <div className={styles.deleteButton} onClick={handleDelete}>
            <Icon iconName="delete" />
          </div>
        </div>
      </div>
      <Items parent={section} />
      {/* </Droppable> */}
    </div>
  );
};

export { Section };
