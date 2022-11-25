import Head from "next/head";
import { GetServerSidePropsContext } from "next";
import { uiConfig } from "../../firebase/firebaseAuthUI.config";
import { useAuth } from "../../firebase/authContext";
import StyledFirebaseUi from "../../firebase/StyledFirebaseUi";
import { verifyAuthToken } from "../../firebase/verifyAuthToken";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { serializedUser } = await verifyAuthToken(ctx);

  if (serializedUser)
    return {
      redirect: {
        permanent: false,
        destination: "/lists",
      },
      props: {} as never,
    };
  else
    return {
      props: {} as never,
    };
};

const Login = () => {
  const { auth } = useAuth();

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
