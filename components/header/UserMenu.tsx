import { signOut } from "firebase/auth";
import Image from "next/image";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/firebase";
import styles from "../../styles/userMenu.module.css";

const UserMenu = () => {
  const [user] = useAuthState(auth);

  return (
    <>
      {user && (
        <div className={styles.userWidget}>
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
          <div className={styles.userMenu}>
            <div className={styles.userMenuList}>
              <div
                className={styles.userMenuItem}
                onClick={() => signOut(auth)}
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
