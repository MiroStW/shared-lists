import Head from "next/head";
import router from "next/router";
import nookies from "nookies";
import { getAuth } from "firebase/auth";
// eslint-disable-next-line import/no-unresolved
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { Loading } from "../../components/utils/Loading";
import { Error } from "../../components/utils/Error";
import { uiConfig } from "../../firebase/firebaseAuthUI.config";
import { useAuth } from "../../firebase/authContext";
import StyledFirebaseUi from "../../firebase/StyledFirebaseUi";
import { firebaseAdmin } from "../../firebase/firebaseAdmin";

// TODO: remove loading states and error messages from login page
// TODO: move login state check to SSR & redirect right away

// Need for 2 SSR helper:
// 1. to check if user is already logged in
// 2. to redirect if not logged in (to login page)

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  try {
    const cookies = nookies.get(ctx);
    if (cookies.token) {
      const token = await getAdminAuth(firebaseAdmin).verifyIdToken(
        cookies.token
      );
      const { uid } = token;
      const user = await getAdminAuth(firebaseAdmin).getUser(uid);
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

const Login = ({
  serializedUser,
  serializedError,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const user = serializedUser ? JSON.parse(serializedUser) : null;
  const error = serializedError ? JSON.parse(serializedError) : null;
  const { auth } = useAuth();
  // const { user, auth, loading, error } = useAuth();
  // const router = useRouter();

  // if (loading) return <Loading />;
  if (error) return <Error msg={error.message} />;
  else if (user) {
    // user is already logged in, redirect to home page
    router.push("/lists");
  }

  return (
    <>
      <Head>
        <title>sharedLists | LogIn</title>
      </Head>
      <div>
        <div>
          <h1>Log in</h1>
        </div>
        <StyledFirebaseUi uiConfig={uiConfig()} firebaseAuth={auth} />
      </div>
    </>
  );
};

export default Login;
