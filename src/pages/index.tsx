import { getAuth } from "firebase-admin/auth";
import { Auth, signOut, User } from "firebase/auth";
import type {
  GetServerSideProps,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import Link from "next/link";
import { Loading } from "../components/utils/Loading";
import { useAuth } from "../firebase/authContext";
import { firebase } from "../firebase/firebase";
import styles from "../styles/main.module.css";

interface SSRProps {
  auth: Auth;
}

export const getServerSideProps = async () => {
  const auth = JSON.stringify(getAuth(firebase));
  const user = getAuth().verifyIdToken();

  return {
    props: { auth },
  };
};

const Home = ({
  auth,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  // const { user, loading, auth } = useAuth();
  const authObj = JSON.parse(auth) as Auth;
  return (
    <>
      <h1>Shared Lists</h1>
      <p>This is an empty home page, to be filled.</p>
      <div className={styles.loginStatus}>
        {/* {loading && <Loading size={40} />} */}

        {authObj.currentUser && (
          // !loading &&
          <>
            <Link href="/lists">
              <button>open app</button>
            </Link>
            <button onClick={() => signOut(authObj)}>logout</button>
          </>
        )}
        {!authObj.currentUser && (
          // !loading &&
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
