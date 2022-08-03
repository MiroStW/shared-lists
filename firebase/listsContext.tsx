import { query, where } from "firebase/firestore";
import { createContext, ReactNode, useContext } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { List } from "../types/types";
import { useAuth } from "./authContext";
import { listConverter } from "./firestoreConverter";
import { lists as listsRef } from "./useDb";

const listsContext = createContext({
  lists: [] as List[] | undefined,
  loading: true,
  error: undefined as Error | undefined,
});

export const ListsContextProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [listSnapshot, loading, error] = useCollection(
    query(
      listsRef,
      // where("ownerID", "==", user?.uid),
      where("isArchived", "==", false)
      // orderBy("createdDate", "desc")
    ).withConverter(listConverter),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );

  return (
    <listsContext.Provider
      value={{
        lists: listSnapshot?.docs.map((list) => list.data()),
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
