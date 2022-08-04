import { FirestoreError, onSnapshot, query, where } from "firebase/firestore";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { List } from "../types/types";
import { useAuth } from "./authContext";
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

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (user) {
      const listsnapshot: List[] = [];

      const q = query(
        listsRef,
        where("ownerID", "==", user?.uid),
        where("isArchived", "==", false)
        // orderBy("createdDate", "desc")
      ).withConverter(listConverter);

      const unsubscribe = onSnapshot(
        q,
        { includeMetadataChanges: true },
        async (snapshot) => {
          setLoading(true);
          snapshot.forEach((doc) => {
            listsnapshot.push(doc.data());
          });
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
