// import * as admin from "firebase-admin/app";
// eslint-disable-next-line import/no-unresolved
import * as fbAdmin from "firebase-admin/firestore";
import { getApps, getApp, initializeApp, cert } from "firebase-admin/app";
import { firebaseAdminConfig } from "./firebase-config";

const firebaseAdmin = !getApps().length
  ? initializeApp(
      {
        credential: cert({
          projectId: firebaseAdminConfig.project_id,
          clientEmail: firebaseAdminConfig.client_email,
          privateKey: firebaseAdminConfig.private_key
            ? JSON.parse(firebaseAdminConfig.private_key)
            : undefined,
        }),
      },
      process.env.NEXT_PUBLIC_FB_PROJECT_ID
    )
  : getApp(process.env.NEXT_PUBLIC_FB_PROJECT_ID);

const adminDb = () => {
  const fsInstance = fbAdmin.getFirestore(firebaseAdmin);
  return fsInstance;
};

export { firebaseAdmin, adminDb };
