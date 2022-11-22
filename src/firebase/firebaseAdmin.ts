import * as admin from "firebase-admin";
import { getApps, getApp } from "firebase-admin/app";

import { firebaseAdminConfig } from "./firebase-config";

const firebaseAdmin = !getApps().length
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseAdminConfig.project_id,
        clientEmail: firebaseAdminConfig.client_email,
        privateKey: firebaseAdminConfig.private_key,
      }),
    })
  : getApp();

export { firebaseAdmin };
