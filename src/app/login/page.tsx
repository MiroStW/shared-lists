// eslint-disable-next-line import/no-unresolved
import Head from "next/head";
import { GetServerSidePropsContext } from "next";
import { uiConfig } from "../../firebase/firebaseAuthUI.config";
import { useAuth } from "../../firebase/authContext";
import StyledFirebaseUi from "../../firebase/StyledFirebaseUi";
import { verifyAuthToken } from "../context/verifyAuthToken";
import { adminDb } from "../../firebase/firebaseAdmin";
import Login from "./Login";

const redirectToFirstList = async () => {
  const { user } = await verifyAuthToken();

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

const Page = async () => {
  return <Login />;
};

export default Page;
