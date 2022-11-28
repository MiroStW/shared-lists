import {
  addDoc,
  FirestoreError,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { List } from "../types/types";
import { useAuth } from "./authContext";
import { createListData } from "./factory";
import { listConverter } from "./firestoreConverter";
import { lists as listsRef } from "./useDb";

const listsContext = createContext({
  lists: [] as List[] | undefined,
  loading: true,
  error: undefined as FirestoreError | undefined,
});

export const ListsContextProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [ownedLists, setOwnedLists] = useState<List[]>([]);
  const [joinedLists, setJoinedLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | undefined>(undefined);

  const getOwnedLists = () => {
    const ownedListsQuery = query(
      listsRef,
      where("ownerID", "==", user?.uid),
      where("isArchived", "==", false),
      orderBy("createdDate", "asc")
    ).withConverter(listConverter);

    const unsubscribe = onSnapshot(
      ownedListsQuery,
      { includeMetadataChanges: true },
      async (snapshot) => {
        const listsnapshot: List[] = [];
        setLoading(true);
        snapshot.forEach((doc) => {
          listsnapshot.push(doc.data());
        });
        if (!snapshot.size && user) {
          addDoc(listsRef, createListData("my first list", user));
        }
        setOwnedLists(listsnapshot);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  };

  const getJoinedLists = () => {
    const joinedListsQuery = query(
      listsRef,
      where("contributors", "array-contains", user?.uid),
      where("isArchived", "==", false),
      orderBy("createdDate", "asc")
    ).withConverter(listConverter);

    const unsubscribe = onSnapshot(
      joinedListsQuery,
      { includeMetadataChanges: true },
      async (snapshot) => {
        const listsnapshot: List[] = [];
        setLoading(true);
        snapshot.forEach((doc) => {
          listsnapshot.push(doc.data());
        });
        setJoinedLists(listsnapshot);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  // useEffect(() => {
  //   console.log("owned: ", ownedLists);
  //   console.log("joined: ", joinedLists);
  // }, [ownedLists, joinedLists]);

  useEffect(() => {
    if (user) {
      const unsubscribeOwnedLists = getOwnedLists();

      const unsubscribeJoinedLists = getJoinedLists();

      return () => {
        unsubscribeOwnedLists();
        unsubscribeJoinedLists();
      };
    }

    return undefined;
  }, [user]);

  return (
    <listsContext.Provider
      value={{
        lists: ownedLists.concat(joinedLists),
        loading,
        error,
      }}
    >
      {children}
    </listsContext.Provider>
  );
};

export const useLists = () => {
  return useContext(listsContext);
};
