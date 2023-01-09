import { redirect } from "next/navigation";
import { adminDb } from "../../../firebase/firebaseAdmin";
import { AdminList } from "../../../types/types";
import { verifyAuthToken } from "../../context/verifyAuthToken";
import ShowApp from "./ShowApp";

// TODO: also prerender items/sections of list with id param

export const getLists = async () => {
  const { user } = await verifyAuthToken();

  if (user) {
    const ownedLists = adminDb()
      .collection("lists")
      .where("ownerID", "==", user.uid)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      // .withConverter(listConverter)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          return [];
        }
        return snapshot.docs.map(
          (doc) =>
            ({
              data: doc.data(),
              ref: {
                ...doc.ref,
                id: doc.id,
                parent: {
                  ...doc.ref.parent,
                  id: doc.ref.parent.id,
                },
                path: doc.ref.path,
              },
            } as AdminList)
        );
        // QUESTION: is there a better way to add getter functions like doc.id
        // to the ref? Without this, the getter functions are stripped away by JSON.stringify
      });

    const joinedLists = adminDb()
      .collection("lists")
      .where("contributors", "array-contains", user.uid)
      .where("isArchived", "==", false)
      .orderBy("createdDate", "asc")
      // .withConverter(listConverter)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          return [];
        }
        return snapshot.docs.map(
          (doc) =>
            ({
              data: doc.data(),
              ref: { ...doc.ref, id: doc.id },
            } as AdminList)
        );
      });

    const lists = await Promise.all([ownedLists, joinedLists]).then((values) =>
      values.flat()
    );

    // TODO: do i still need to stringify the lists?
    return JSON.stringify(lists);
  } else return null;
};

const page = async ({ params }: { params: { id: string } }) => {
  const serializedLists = await getLists();
  if (!serializedLists) redirect("/login");

  const prefetchedLists = JSON.parse(serializedLists) as AdminList[];
  const activeList = prefetchedLists.find((list) => list.ref.id === params.id);
  if (!activeList) redirect("/lists");

  return <ShowApp prefetchedLists={prefetchedLists} activeList={activeList} />;
};

export default page;
