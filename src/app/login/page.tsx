import { redirect } from "next/navigation";
import { verifyAuthToken } from "./verifyAuthToken";
import { adminDb } from "../../firebase/firebaseAdmin";
import ShowLogin from "./ShowLogin";
import { createAdminListData } from "../../firebase/adminFactory";

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
          adminDb()
            .collection("lists")
            .add(createAdminListData("my first list", user));
          return null;
        }
        return snapshot.docs[0].id;
      });
    return firstListId;
  }
  return null;
};

const Page = async () => {
  const firstListId = await getFirstListId();
  if (firstListId) redirect(`/lists/${firstListId}`);

  return <ShowLogin />;
};

export default Page;
