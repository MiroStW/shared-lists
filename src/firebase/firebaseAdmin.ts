import * as admin from "firebase-admin";
// eslint-disable-next-line import/no-unresolved
import * as fbAdmin from "firebase-admin/firestore";
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

const adminDb = () => {
  const fsInstance = fbAdmin.getFirestore(firebaseAdmin);
  return fsInstance;
};

export { firebaseAdmin, adminDb };
