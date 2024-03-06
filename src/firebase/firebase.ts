import { getApp, getApps, initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

import { firebaseConfig } from "./firebase-config";

const firebase = !getApps().length
  ? initializeApp(firebaseConfig, process.env.NEXT_PUBLIC_FB_PROJECT_ID)
  : getApp(process.env.NEXT_PUBLIC_FB_PROJECT_ID);

const functions = getFunctions(firebase, "europe-west1");

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);

export { firebase, functions };
