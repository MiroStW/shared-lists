// eslint-disable-next-line import/no-unresolved
import { getAuth } from "firebase-admin/auth";
import { Auth, signOut, User } from "firebase/auth";
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import Link from "next/link";
import nookies from "nookies";
import { Loading } from "../components/utils/Loading";
import { useAuth } from "../firebase/authContext";
import { firebaseAdmin } from "../firebase/firebaseAdmin";
import styles from "../styles/main.module.css";

interface SSRProps {
  auth: Auth;
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  try {
    const cookies = nookies.get(ctx);
    const token = await getAuth(firebaseAdmin).verifyIdToken(cookies.token);

    const { uid } = token;

    const user = await getAuth(firebaseAdmin).getUser(uid);

    return {
      props: { user },
    };
  } catch (err) {
    ctx.res.writeHead(302, { Location: "/login" });
    ctx.res.end();
    console.log("err: ", err);
    return {
      props: {} as never,
    };
  }
};

const Home = ({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { auth } = useAuth();
  // const { user, loading, auth } = useAuth();
  return (
    <>
      <h1>Shared Lists</h1>
      <p>This is an empty home page, to be filled.</p>
      <div className={styles.loginStatus}>
        {/* {loading && <Loading size={40} />} */}

        {user && (
          // !loading &&
          <>
            <Link href="/lists">
              <button>open app</button>
            </Link>
            <button onClick={() => signOut(auth)}>logout</button>
          </>
        )}
        {!user && (
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
