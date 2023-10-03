import { adminDb } from "@firebase/firebaseAdmin";
import { createAdminListData } from "./adminFactory";
import getServerSession from "auth/getServerSession";

export const getFirstListId = async () => {
  const { user } = await getServerSession();
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
        .add(createAdminListData("my first list", user.uid));
      return null;
    }

    const firstListId = snapshot.docs[0].id;

    return firstListId;
  }
  return null;
};
