import { adminDb } from "@firebase/firebaseAdmin";
import { verifyAuthToken } from "auth/verifyAuthToken";
import { createAdminListData } from "./adminFactory";

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
      adminDb()
        .collection("lists")
        .add(createAdminListData("my first list", user));
      return null;
    }

    const firstListId = snapshot.docs[0].id;

    return firstListId;
  }
  return null;
};
