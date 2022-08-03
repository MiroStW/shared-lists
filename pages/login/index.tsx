import Head from "next/head";
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";
import { Loading } from "../../components/Loading";
import { Error } from "../../components/Error";
import { uiConfig } from "../../firebase/firebaseAuthUI.config";
import { useAuth } from "../../firebase/authContext";

const Login = () => {
  const { user, loading, error, auth } = useAuth();
  // const router = useRouter();

  if (loading) return <Loading />;
  else if (error) return <Error msg={error.message} />;
  else if (user) {
    // user is already logged in, redirect to home page
    // router.push("/");
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
        <StyledFirebaseAuth uiConfig={uiConfig()} firebaseAuth={auth} />
      </div>
    </>
  );
};

export default Login;
