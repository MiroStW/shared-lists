"use client";

// eslint-disable-next-line import/no-unresolved
import { UserRecord } from "firebase-admin/auth";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./context/authContext";
import styles from "../styles/main.module.css";

const Home = ({ user }: { user?: UserRecord }) => {
  const { auth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("user", user);
  }, [user]);

  return (
    <>
      <h1>Shared Lists</h1>
      {user && <p>Hi {user.displayName},</p>}
      <p>This is an empty home page, to be filled!</p>
      <div className={styles.loginStatus}>
        {user && (
          <>
            <Link href="/lists">
              <button>open app</button>
            </Link>
            <button onClick={() => signOut(auth).then(() => router.push("/"))}>
              logout
            </button>
          </>
        )}
        {!user && (
          <>
            <button>
              <Link href={"/login"}>Login</Link>
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default Home;
