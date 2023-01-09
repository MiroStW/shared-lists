import { redirect } from "next/navigation";
import { createAdminListData } from "../../firebase/adminFactory";
import { adminDb } from "../../firebase/firebaseAdmin";
import { verifyAuthToken } from "../context/verifyAuthToken";

const getFirstListId = async () => {
  const { user } = await verifyAuthToken();
  if (user) {
    const firstListId = await adminDb()
      .collection("lists")
      .where("ownerID", "==", user.uid)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      .limit(1)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          return null;
        }
        return snapshot.docs[0].id;
      });
    return firstListId;
  }
  return null;
};

const Lists = async () => {
  const firstListId = await getFirstListId();
  if (firstListId) redirect(`/lists/${firstListId}`);
  redirect("/login");
};

export default Lists;
