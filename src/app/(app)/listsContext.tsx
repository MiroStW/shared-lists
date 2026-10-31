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
import { useLiveUpdates } from "app/shared/useLiveUpdates";

const listsContext = createContext({
  lists: [] as List[] | undefined,
  loading: true,
  error: undefined as unknown,
  refreshLists: () => {},
});

export const ListsContextProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useClientSession();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);

  // Live reloads pass showLoading = false so the lists do not flicker.
  const fetchLists = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
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

  // Any change can rename, archive or remove a list, so reload on every one.
  useLiveUpdates(
    () => true,
    () => fetchLists(false),
  );

  return (
    <listsContext.Provider
      value={{
        lists,
        loading,
        error,
        refreshLists: () => fetchLists(),
      }}
    >
      {children}
    </listsContext.Provider>
  );
};

export const useLists = () => {
  return useContext(listsContext);
};
