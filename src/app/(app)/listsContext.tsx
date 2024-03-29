"use client";

import { listConverter } from "db/firestoreConverter";
import {
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
import { List } from "types/types";
import { lists as listsRef } from "db/useDb";
import { useClientSession } from "app/sessionContext";

const listsContext = createContext({
  lists: [] as List[] | undefined,
  loading: true,
  error: undefined as FirestoreError | undefined,
});

export const ListsContextProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useClientSession();
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
