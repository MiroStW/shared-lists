"use client";

import { useAuth } from "app/authContext";
import { signOut } from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../../styles/userMenu.module.css";

const UserMenu = () => {
  const { user, auth } = useAuth();
  const [hideMenu, setHideMenu] = useState(true);
  const router = useRouter();

  const clickHandler = () => {
    setHideMenu(!hideMenu);
  };

  return (
    <>
      {user && (
        <div className={styles.userWidget} onClick={clickHandler}>
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
              <div
                className={styles.userMenuItem}
                onClick={() => {
                  signOut(auth).then(() => {
                    router.push("/login");
                  });
                }}
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
