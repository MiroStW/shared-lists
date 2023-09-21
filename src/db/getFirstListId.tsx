import { adminDb } from "@firebase/firebaseAdmin";
import { createAdminListData } from "./adminFactory";
import { getServerSession } from "next-auth";

import { authOptions } from "app/api/auth/[...nextauth]/route";

export const getFirstListId = async () => {
  const user = (await getServerSession(authOptions))?.user;
  if (user) {
    const snapshot = await adminDb()
      .collection("lists")
      .where("ownerID", "==", user.id)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      .limit(1)
      .get();
    if (snapshot.empty) {
      adminDb()
        .collection("lists")
        .add(createAdminListData("my first list", user.id));
      return null;
    }

    const firstListId = snapshot.docs[0].id;

    return firstListId;
  }
  return null;
};
