import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { firebaseConfig } from "./firebase-config";

const firebase = initializeApp(firebaseConfig);

const auth = getAuth(firebase);
const db = getFirestore(firebase);

export { firebase, auth, db };
