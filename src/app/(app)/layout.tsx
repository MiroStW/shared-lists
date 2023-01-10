import { verifyAuthToken } from "app/verifyAuthToken";
import { redirect } from "next/navigation";
import { AdminList } from "types/types";
import { adminDb } from "../../firebase/firebaseAdmin";
import ShowApp from "./ShowApp";

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

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const serializedLists = await getLists();
  if (!serializedLists) redirect("/login");
  const prefetchedLists = JSON.parse(serializedLists) as AdminList[];

  return <ShowApp prefetchedLists={prefetchedLists}>{children}</ShowApp>;
};

export default AppLayout;
