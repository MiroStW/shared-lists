"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./userMenu.module.css";
import { useClientSession } from "app/sessionContext";
import { signOut } from "next-auth/react";

const UserMenu = () => {
  const { user } = useClientSession();
  const [hideMenu, setHideMenu] = useState(true);

  const openMenuHandler = () => {
    setHideMenu(!hideMenu);
  };

  return (
    <>
      {user && (
        <div className={styles.userWidget} onClick={openMenuHandler}>
          <div className={styles.userImage}>
            {user.image ? (
              <Image
                src={user.image}
                alt="profile picture"
                width={28}
                height={28}
              />
            ) : (
              user.name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")
            )}
          </div>
          <div className={styles.userMenu} hidden={hideMenu}>
            <div className={styles.userMenuList}>
              <div
                className={styles.userMenuItem}
                onClick={() => signOut()}
              >
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
