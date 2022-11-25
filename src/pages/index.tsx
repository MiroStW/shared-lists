import { signOut, User } from "firebase/auth";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../firebase/authContext";
import { verifyAuthToken } from "../firebase/verifyAuthToken";
import styles from "../styles/main.module.css";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { serializedUser } = await verifyAuthToken(ctx);

  return {
    props: serializedUser
      ? {
          serializedUser,
        }
      : ({} as never),
  };
};

const Home = ({
  serializedUser,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const user = serializedUser ? (JSON.parse(serializedUser) as User) : null;
  const { auth } = useAuth();
  const router = useRouter();
  // const { user, loading, auth } = useAuth();

  return (
    <>
      <h1>Shared Lists</h1>
      {user && <p>Hi {user.displayName},</p>}
      <p>This is an empty home page, to be filled.</p>
      <div className={styles.loginStatus}>
        {/* {loading && <Loading size={40} />} */}
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
