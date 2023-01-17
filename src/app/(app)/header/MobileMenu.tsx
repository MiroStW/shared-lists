import { Dispatch, SetStateAction } from "react";
import { Icon } from "../../shared/Icon";
import styles from "./mobileMenu.module.css";

const MobileMenu = ({
  showMobileLists,
  setShowMobileLists,
}: {
  showMobileLists: boolean;
  setShowMobileLists: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <div
      className={styles.mobileMenuBtn}
      onClick={() => {
        setShowMobileLists(!showMobileLists);
      }}
    >
      {showMobileLists ? (
        <Icon iconName="close" style="filled" size={24} />
      ) : (
        <Icon iconName="menu" style="filled" size={24} />
      )}
    </div>
  );
};

export { MobileMenu };
// const toggleMobileMenu = () => {
//   const projectArea = document.querySelector(`.${projectStyles.projectarea}`)!;
//   const mobileMenuBtn = document.querySelector(`.${styles.mobileMenuBtn}`)!;

//   projectArea.classList.toggle(styles.open);
//   Array.from(mobileMenuBtn.children).forEach((icon) => {
//     icon.classList.toggle(styles.hideIcon);
//   });
// };

// const mobileMenuBtn = () => {
//   const header = document.querySelector(`.${headerStyles.header}`)!;

//   const btn = document.createElement("div");
//   btn.classList.add(styles.mobileMenuBtn);
//   header.appendChild(btn);

//   closeMenuIcon.classList.add(styles.hideIcon);

//   btn.addEventListener("click", toggleMobileMenu);
// };

// export { mobileMenuBtn, toggleMobileMenu };
