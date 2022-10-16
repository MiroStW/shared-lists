import { getAuth, signOut } from "firebase/auth";
import type { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import { Loading } from "../components/utils/Loading";
import { useAuth } from "../firebase/authContext";
import { firebase } from "../firebase/firebase";
import styles from "../styles/main.module.css";

export const getServerSideProps: GetServerSideProps = async () => {
  const user = getAuth(firebase).currentUser;

  return {
    props: {user},
  };

const Home: NextPage = ({user}) => {

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
