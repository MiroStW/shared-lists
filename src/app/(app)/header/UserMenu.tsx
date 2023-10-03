"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./userMenu.module.css";
import { useClientSession } from "app/sessionContext";
import { signOut } from "firebase/auth";

const UserMenu = () => {
  const { user, auth } = useClientSession();
  const [hideMenu, setHideMenu] = useState(true);

  const openMenuHandler = () => {
    setHideMenu(!hideMenu);
  };

  return (
    <>
      {user && (
        <div className={styles.userWidget} onClick={openMenuHandler}>
          <div className={styles.userImage}>
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt="profile picture"
                width={28}
                height={28}
              />
            ) : (
              user.displayName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
            )}
          </div>
          <div className={styles.userMenu} hidden={hideMenu}>
            <div className={styles.userMenuList}>
              <div className={styles.userMenuItem} onClick={() => signOut(auth)}>
                sign out
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { UserMenu };
