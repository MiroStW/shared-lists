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
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | undefined>(undefined);

  useEffect(() => {
    if (user) {
      const q = query(
        listsRef,
        where("ownerID", "==", user?.uid),
        where("isArchived", "==", false),
        orderBy("createdDate", "asc")
      ).withConverter(listConverter);

      const unsubscribe = onSnapshot(
        q,
        { includeMetadataChanges: true },
        async (snapshot) => {
          const listsnapshot: List[] = [];
          setLoading(true);
          snapshot.forEach((doc) => {
            listsnapshot.push(doc.data());
          });
          if (!snapshot.size)
            addDoc(listsRef, createListData("my first list", user));
          setLists(listsnapshot);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
      return () => {
        unsubscribe();
      };
    }
    return undefined;
  }, [user]);

  return (
    <listsContext.Provider value={{ lists, loading, error }}>
      {children}
    </listsContext.Provider>
  );
};

export const useLists = () => {
  return useContext(listsContext);
};
