// eslint-disable-next-line import/no-unresolved
import { getAuth } from "firebase-admin/auth";
import { signOut } from "firebase/auth";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import nookies from "nookies";
import { useAuth } from "../firebase/authContext";
import { firebaseAdmin } from "../firebase/firebaseAdmin";
import styles from "../styles/main.module.css";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  try {
    const cookies = nookies.get(ctx);
    if (cookies.token) {
      const token = await getAuth(firebaseAdmin).verifyIdToken(cookies.token);
      const { uid } = token;
      const user = await getAuth(firebaseAdmin).getUser(uid);
      const serializedUser = JSON.stringify(user);

      return {
        props: { serializedUser },
      };
    } else return { props: {} as never };
  } catch (error) {
    // ctx.res.writeHead(302, { Location: "/login" });
    // ctx.res.end();
    const serializedError = JSON.stringify(error);

    return {
      props: {
        serializedUser: null,
        serializedError,
      },
    };
  }
};

const Home = ({
  serializedUser,
  serializedError,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const user = serializedUser ? JSON.parse(serializedUser) : null;
  const error = serializedError ? JSON.parse(serializedError) : null;
  const { auth } = useAuth();
  const router = useRouter();
  // const { user, loading, auth } = useAuth();

  return (
    <>
      <h1>Shared Lists</h1>
      <p>This is an empty home page, to be filled.</p>
      <div className={styles.loginStatus}>
        {/* {loading && <Loading size={40} />} */}
        {error && (
          <div>
            <p>There was an error:</p>
            {error.message}
            {/* {Object.keys(error).forEach((key) => (
              <p>
                {key}: {error[key]}
              </p>
            ))} */}
          </div>
        )}
        {user && (
          // !loading &&
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
