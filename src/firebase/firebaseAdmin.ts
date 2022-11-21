import { getApp } from "firebase/app";
import {
  initializeApp as initializeAdminApp,
  credential,
} from "firebase-admin";
import { getApps as getAdminApps } from "firebase-admin/app";

import { firebaseAdminConfig } from "./firebase-config";

const firebaseAdmin = !getAdminApps().length
  ? initializeAdminApp({
      credential: credential.cert({
        projectId: firebaseAdminConfig.project_id,
        clientEmail: firebaseAdminConfig.client_email,
        privateKey: firebaseAdminConfig.private_key,
      }),
    })
  : getApp();

export { firebaseAdmin };
