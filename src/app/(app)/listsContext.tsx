"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { List, ListData } from "types/types";
import { useClientSession } from "app/sessionContext";

const listsContext = createContext({
  lists: [] as List[] | undefined,
  loading: true,
  error: undefined as any | undefined,
  refreshLists: () => {},
});

export const ListsContextProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useClientSession();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | undefined>(undefined);

  const fetchLists = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/lists");
      if (!response.ok) {
        throw new Error("Failed to fetch lists");
      }
      const data: ListData[] = await response.json();
      setLists(data.map(d => ({ id: d.id, data: d })));
      setError(undefined);
    } catch (err) {
      console.error("fetchLists error: ", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [user]);

  return (
    <listsContext.Provider
      value={{
        lists,
        loading,
        error,
        refreshLists: fetchLists,
      }}
    >
      {children}
    </listsContext.Provider>
  );
};

export const useLists = () => {
  return useContext(listsContext);
};
