import { adminDb } from "@firebase/firebaseAdmin";
import { verifyAuthToken } from "auth/verifyAuthToken";

export const getFirstListId = async () => {
  const { user } = await verifyAuthToken();
  if (user) {
    const snapshot = await adminDb()
      .collection("lists")
      .where("ownerID", "==", user.uid)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const firstListId = snapshot.docs[0].id;

    return firstListId;
  }
  return null;
};
