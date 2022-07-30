import { GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";

const uiConfig = () => {
  return {
    signInFlow: "popup",
    signInSuccessUrl: "/",
    // tosUrl: "/terms-of-service",
    // privacyPolicyUrl: "/privacy-policy",
    signInOptions: [
      EmailAuthProvider.PROVIDER_ID,
      GoogleAuthProvider.PROVIDER_ID,
    ],
  };
};

export { uiConfig };
