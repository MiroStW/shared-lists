"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { AdminList, Item as ItemType, Section, ItemData } from "types/types";

interface ItemsContextType {
  items: ItemType[];
  sections: Section[];
  localItems: { [key: string]: ItemType[] };
  setLocalItems: Dispatch<SetStateAction<{ [key: string]: ItemType[] }>>;
  deleteLocalItem: (item: ItemType) => void;
  addLocalItem: ({
    sectionId,
    order,
  }: {
    sectionId?: string;
    order?: number;
  }) => void;
  loading: boolean;
  error?: any;
  refreshItems: () => void;
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
  const [error, setError] = useState<any>(undefined);

  const [localItems, setLocalItems] = useState<{
    [key: string]: ItemType[];
  }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, sectionsRes] = await Promise.all([
        fetch(`/api/lists/${list.id}/items`),
        fetch(`/api/lists/${list.id}/sections`)
      ]);

      if (!itemsRes.ok || !sectionsRes.ok) throw new Error("Failed to fetch items or sections");

      const itemsData: ItemData[] = await itemsRes.json();
      const sectionsData: any[] = await sectionsRes.json();

      const mappedItems = itemsData.map(d => ({ id: d.id, data: d }));
      const mappedSections = sectionsData.map(d => ({ id: d.id, data: d }));

      setItems(mappedItems);
      setSections(mappedSections);
      setError(undefined);
    } catch (err) {
      console.error("fetchData error: ", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [list.id]);

  // update localItems when items or sections change
  useEffect(() => {
    if (items) {
      const newItems = Object.keys(localItems).reduce(
        (acc, container) => [
          ...acc,
          ...localItems[container].filter((item) =>
            item.id.startsWith("newItem_")
          ),
        ],
        [] as ItemType[]
      );

      const updatedLocalItems: { [key: string]: ItemType[] } = {
        [list.id]: items
          ?.concat(newItems)
          .filter((item) => item.data.listID === list.id && !item.data.sectionID)
          .sort((a, b) => a.data.order - b.data.order),
      };

      sections.forEach((section) => {
        updatedLocalItems[section.id] = items
          ? items
              .concat(newItems)
              .filter((item) => item.data.sectionID === section.id)
              .sort((a, b) => a.data.order - b.data.order)
          : [];
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
        deleteLocalItem,
        addLocalItem,
        loading,
        error,
        refreshItems: fetchData,
      }}
    >
      {children}
    </itemsContext.Provider>
  );
};

export const useItems = () => {
  return useContext(itemsContext);
};
