import styles from "../../styles/section.module.css";
import { Section as SectionType } from "../../types/types";
import { Icon } from "../utils/Icon";
import { Items } from "./Items";

const Section = ({ section }: { section: SectionType }) => {
  const handleDelete = () => {
    console.log("click");
  };

  return (
    <div className={`${styles.section} `}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionName}>{section.data.name}</div>
        <div className={styles.sectionHoverMenu}>
          <div className={styles.deleteButton} onClick={handleDelete}>
            <Icon iconName="delete" />
          </div>
        </div>
      </div>
      <Items parent={section} />
    </div>
  );
};

export { Section };
