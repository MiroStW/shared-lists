import { adminDb } from "@firebase/firebaseAdmin";
import { verifySession } from "auth/verifySession";
import { createAdminListData } from "./adminFactory";

export const getFirstListId = async () => {
  const { user } = await verifySession();
  console.log("user in getFirstListId: ", user?.email);
  if (user) {
    const snapshot = await adminDb()
      .collection("lists")
      .where("ownerID", "==", user.uid)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      .limit(1)
      .get();
    // console.log("snapshot in getFirstListId: ", snapshot.docs[0].id);
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
