import Head from "next/head";
import router from "next/router";
import { Loading } from "../../components/utils/Loading";
import { Error } from "../../components/utils/Error";
import { uiConfig } from "../../firebase/firebaseAuthUI.config";
import { useAuth } from "../../firebase/authContext";
import StyledFirebaseUi from "../../firebase/StyledFirebaseUi";

const Login = () => {
  const { user, loading, error, auth } = useAuth();
  // const router = useRouter();

  if (loading) return <Loading />;
  else if (error) return <Error msg={error.message} />;
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
