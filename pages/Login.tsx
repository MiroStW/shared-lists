import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/router";
import Head from "next/head";
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";
import { useEffect } from "react";
import { auth } from "../firebase/firebase.js";
import { Loading } from "../components/Loading";
import { Error } from "../components/Error";
import { uiConfig } from "../firebase/firebaseAuthUI.config";

const Login = () => {
  const [user, loading, error] = useAuthState(auth);
  // const router = useRouter();

  useEffect(() => {
    console.log(user);
  }, [user]);

  if (loading) return <Loading />;
  else if (error) return <Error msg={error} />;
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
