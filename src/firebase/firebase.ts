import { getApp, getApps, initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

import { firebaseConfig } from "./firebase-config";

const firebase = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const functions = getFunctions(firebase, "europe-west3");

// comment out this line to switch to production db
if (process.env.NEXT_PUBLIC_DEVELOPMENT === "TRUE")
  connectFunctionsEmulator(functions, "localhost", 5001);

export { firebase, functions };
