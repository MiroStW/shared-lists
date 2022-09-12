import { initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

import { firebaseConfig } from "./firebase-config";

const firebase = initializeApp(firebaseConfig);

const functions = getFunctions(firebase);
connectFunctionsEmulator(functions, "localhost", 5001);

export { firebase, functions };
