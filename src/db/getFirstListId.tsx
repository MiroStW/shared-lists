import { adminDb } from "@firebase/firebaseAdmin";
import { createAdminListData } from "./adminFactory";
import { getServerSession } from "auth/getServerSession";

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
      const newList = await adminDb()
        .collection("lists")
        .add(createAdminListData("my first list", user.uid));

      return newList.id;
    }

    return snapshot.docs[0].id;
  }
  return null;
};
