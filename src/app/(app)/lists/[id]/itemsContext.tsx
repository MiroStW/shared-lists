"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLiveUpdates } from "app/shared/useLiveUpdates";
import {
  AdminList,
  Item as ItemType,
  Section,
  SectionData,
  ItemData,
} from "types/types";

interface ItemsContextType {
  items: ItemType[];
  sections: Section[];
  localItems: { [key: string]: ItemType[] };
  setLocalItems: Dispatch<SetStateAction<{ [key: string]: ItemType[] }>>;
  updateLocalItem: (id: string, updates: Partial<ItemData>) => void;
  deleteLocalItem: (item: ItemType) => void;
  addLocalItem: ({
    sectionId,
    order,
  }: {
    sectionId?: string;
    order?: number;
  }) => void;
  loading: boolean;
  error?: unknown;
  refreshItems: () => void;
  setItemEditing: (id: string, editing: boolean) => void;
}

const itemsContext = createContext({} as ItemsContextType);

export const ItemsContextProvider = ({
  children,
  userId,
  list,
}: {
  children: ReactNode;
  userId: string;
  list: AdminList;
}) => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);

  const [localItems, setLocalItems] = useState<{
    [key: string]: ItemType[];
  }>({});

  // Items whose input is open. A reload keeps their local copy, so a change
  // from elsewhere neither moves nor removes an item while it is being typed
  // in. Once the last input closes, a reload skipped meanwhile is caught up.
  const editingItemIds = useRef(new Set<string>());
  const reloadedWhileEditing = useRef(false);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [itemsRes, sectionsRes] = await Promise.all([
        fetch(`/api/lists/${list.id}/items`),
        fetch(`/api/lists/${list.id}/sections`)
      ]);

      if (!itemsRes.ok || !sectionsRes.ok) throw new Error("Failed to fetch items or sections");

      const itemsData: ItemData[] = await itemsRes.json();
      const sectionsData: SectionData[] = await sectionsRes.json();

      const mappedItems = itemsData.map(d => ({ id: d.id, data: d }));
      const mappedSections = sectionsData.map(d => ({ id: d.id, data: d }));

      if (editingItemIds.current.size > 0) reloadedWhileEditing.current = true;
      setItems(mappedItems);
      setSections(mappedSections);
      setError(undefined);
    } catch (err) {
      console.error("fetchData error: ", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [list.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useLiveUpdates(
    (listIds) => listIds.includes(list.id),
    () => fetchData(false),
  );

  const setItemEditing = useCallback(
    (id: string, editing: boolean) => {
      if (editing) {
        editingItemIds.current.add(id);
        return;
      }
      editingItemIds.current.delete(id);
      if (editingItemIds.current.size === 0 && reloadedWhileEditing.current) {
        reloadedWhileEditing.current = false;
        fetchData(false);
      }
    },
    [fetchData],
  );

  // update localItems when items or sections change
  useEffect(() => {
    if (items) {
      // Unsaved new items and items with an open input keep their local copy.
      const keptItems = Object.values(localItems)
        .flat()
        .filter(
          (item) =>
            item.id.startsWith("newItem_") ||
            editingItemIds.current.has(item.id),
        );
      const keptIds = new Set(keptItems.map((item) => item.id));
      const mergedItems = items
        .filter((item) => !keptIds.has(item.id))
        .concat(keptItems);

      const updatedLocalItems: { [key: string]: ItemType[] } = {
        [list.id]: mergedItems
          .filter((item) => item.data.listID === list.id && !item.data.sectionID)
          .sort((a, b) => a.data.order - b.data.order),
      };

      sections.forEach((section) => {
        updatedLocalItems[section.id] = mergedItems
          .filter((item) => item.data.sectionID === section.id)
          .sort((a, b) => a.data.order - b.data.order);
      });

      setLocalItems(updatedLocalItems);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sections]);

  const deleteLocalItem = (item: ItemType) => {
    const containerId = item.data.sectionID || list.id;
    setLocalItems((prev) => {
      const filteredItems = prev[containerId].filter(
        (i) => i.id !== item.id
      );

      const reorderedItems = filteredItems.map((i, index) => {
        return {
          ...i,
          data: {
            ...i.data,
            order: index,
          },
        };
      });

      return {
        ...prev,
        [containerId]: reorderedItems,
      };
    });
  };

  const updateLocalItem = (id: string, updates: Partial<ItemData>) => {
    const updateItem = (item: ItemType): ItemType =>
      item.id === id
        ? {
            ...item,
            data: {
              ...item.data,
              ...updates,
            },
          }
        : item;

    setItems((prev) => prev.map(updateItem));
    setLocalItems((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([containerId, containerItems]) => [
          containerId,
          containerItems.map(updateItem),
        ]),
      ),
    );
  };

  const addLocalItem = ({
    sectionId,
    order = localItems[sectionId || list.id]?.length || 0,
  }: {
    sectionId?: string;
    order?: number;
  }) => {
    const containerId = sectionId || list.id;
    const newItem: ItemType = {
      id: `newItem_${new Date().getTime()}`,
      data: {
        id: "",
        name: "",
        completed: false,
        description: "",
        createdDate: new Date().toISOString(),
        order,
        listID: list.id,
        sectionID: sectionId || null,
      }
    };

    setLocalItems((prev) => ({
      ...prev,
      [containerId]: [
        ...(prev[containerId] || []).slice(0, order),
        newItem,
        ...(prev[containerId] || []).slice(order).map((i) => {
          return {
            ...i,
            data: {
              ...i.data,
              order: i.data.order + 1,
            },
          };
        }),
      ],
    }));
  };

  return (
    <itemsContext.Provider
      value={{
        items,
        sections,
        localItems,
        setLocalItems,
        updateLocalItem,
        deleteLocalItem,
        addLocalItem,
        loading,
        error,
        refreshItems: () => fetchData(false),
        setItemEditing,
      }}
    >
      {children}
    </itemsContext.Provider>
  );
};

export const useItems = () => {
  return useContext(itemsContext);
};
