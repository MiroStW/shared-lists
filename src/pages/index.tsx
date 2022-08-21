import { signOut } from "firebase/auth";
import type { NextPage } from "next";
import Link from "next/link";
import { Loading } from "../components/utils/Loading";
import { useAuth } from "../firebase/authContext";
import styles from "../styles/main.module.css";

const Home: NextPage = () => {
  const { user, loading, auth } = useAuth();

  return (
    <>
      <h1>Shared Lists</h1>
      <p>This is an empty home page, to be filled.</p>
      <div className={styles.loginStatus}>
        {loading && <Loading size={40} />}

        {user && !loading && (
          <>
            <Link href="/lists">
              <button>open app</button>
            </Link>
            <button onClick={() => signOut(auth)}>logout</button>
          </>
        )}
        {!user && !loading && (
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
