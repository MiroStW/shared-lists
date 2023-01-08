// eslint-disable-next-line import/no-unresolved
import Head from "next/head";
import { GetServerSidePropsContext } from "next";
import { uiConfig } from "../../firebase/firebaseAuthUI.config";
import { useAuth } from "../../firebase/authContext";
import StyledFirebaseUi from "../../firebase/StyledFirebaseUi";
import { verifyAuthToken } from "../../firebase/verifyAuthToken";
import { adminDb } from "../../firebase/firebaseAdmin";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { user } = await verifyAuthToken(ctx);

  if (user) {
    const firstListId = await adminDb()
      .collection("lists")
      .where("ownerID", "==", user.uid)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      .limit(1)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          // TODO: handle creation of initial list here
          return null;
        }
        return snapshot.docs[0].id;
      });

    return {
      redirect: {
        permanent: false,
        destination: `/lists/${firstListId}`,
      },
      props: {} as never,
    };
  } else
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
