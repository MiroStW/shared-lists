import { signOut, User } from "firebase/auth";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "../firebase/authContext";
import { verifyAuthToken } from "../firebase/verifyAuthToken";
import styles from "../styles/main.module.css";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { user, fromVerifyAuthToken } = await verifyAuthToken(ctx);

  return {
    props: user
      ? {
          serializedUser: JSON.stringify(user),
          fromServer:
            "this means getServerSideProps code is executed & user found",
          fromVerifyAuthToken,
          ctx: JSON.stringify(ctx.req.headers.cookie),
        }
      : {
          fromServer:
            "this means getServerSideProps code is executed & user not found",
          fromVerifyAuthToken,
          ctx: JSON.stringify(ctx.req.headers.cookie),
        },
  };
};

// PRODUCTION returned user seems to be missing, /lists pushes me back to
// /login, on index I see login button, but token is still there in local storage

const Home = ({
  serializedUser,
  fromServer,
  fromVerifyAuthToken,
  ctx,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const user = serializedUser ? (JSON.parse(serializedUser) as User) : null;
  const { auth } = useAuth();
  const router = useRouter();
  // const { user, loading, auth } = useAuth();

  useEffect(() => {
    console.log("serializedUser: ", serializedUser);
    console.log("user: ", user);
    console.log("auth: ", auth);
    console.log("fromServer: ", fromServer);
    console.log("fromVerifyAuthToken: ", fromVerifyAuthToken);
    console.log("ctx: ", ctx);
  }, [auth, ctx, fromServer, fromVerifyAuthToken, serializedUser, user]);

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
