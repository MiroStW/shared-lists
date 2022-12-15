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
  const { user } = await verifyAuthToken(ctx);

  return {
    props: user
      ? {
          serializedUser: JSON.stringify(user),
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

  return (
    <>
      <h1>Shared Lists</h1>
      {user && <p>Hi {user.displayName},</p>}
      <p>This is an empty home page, to be filled.</p>
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
