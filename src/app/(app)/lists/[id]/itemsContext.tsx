"use client";

import {
  doc,
  FirestoreError,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { AdminList, Item as ItemType, Section } from "types/types";
import { db, items as itemsCol, sectionsOfList } from "db/useDb";
import { createItemData } from "db/factory";
import { itemConverter, sectionConverter } from "db/firestoreConverter";
import { UserRecord } from "firebase-admin/auth";

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
  error?: FirestoreError;
}

const itemsContext = createContext({} as ItemsContextType);

export const ItemsContextProvider = ({
  children,
  user,
  list,
}: {
  children: ReactNode;
  user: UserRecord;
  list: AdminList;
}) => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [errorItems, setErrorItems] = useState<FirestoreError | undefined>(
    undefined
  );

  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [errorSections, setErrorSections] = useState<
    FirestoreError | undefined
  >(undefined);

  const [localItems, setLocalItems] = useState<{
    [key: string]: ItemType[];
  }>({});

  const getItems = () => {
    const itemsQuery = query(
      itemsCol,
      where("list", "==", list.ref.id),
      // orderBy(documentId()),
      // startAt(list.ref.path),
      // endAt(`${list.ref.path}\uf8ff`) // hack to get all subcollections of list
      where("authorizedUsers", "array-contains", user?.uid),
      orderBy("order", "asc")
    ).withConverter(itemConverter);

    const unsubscribe = onSnapshot(
      itemsQuery,
      { includeMetadataChanges: true },
      async (snapshot) => {
        const itemsnapshot: ItemType[] = [];
        setLoadingItems(true);
        snapshot.forEach((item) => {
          itemsnapshot.push(item.data());
        });
        setItems(itemsnapshot);
        setLoadingItems(false);
      },
      (err) => {
        setErrorItems(err);
        setLoadingItems(false);
      }
    );
    return unsubscribe;
  };

  const getSections = () => {
    const sectionsQuery = query(
      sectionsOfList(list),
      where("authorizedUsers", "array-contains", user?.uid)
    ).withConverter(sectionConverter);

    const unsubscribe = onSnapshot(
      sectionsQuery,
      { includeMetadataChanges: true },
      async (snapshot) => {
        const sectionSnapshot: Section[] = [];
        setLoadingSections(true);
        snapshot.forEach((section) => {
          sectionSnapshot.push(section.data());
        });
        setSections(sectionSnapshot);
        setLoadingSections(false);
      },
      (err) => {
        setErrorSections(err);
        setLoadingSections(false);
      }
    );
    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribeItems = getItems();
    const unsubscribeSections = getSections();
    return () => {
      unsubscribeItems();
      unsubscribeSections();
    };
  }, []);

  // update localItems when items or sections change
  useEffect(() => {
    if (items) {
      // get newItems that have not been saved to db yet, to persist them in localItems
      const newItems = Object.keys(localItems).reduce(
        (acc, container) => [
          ...acc,
          ...localItems[container].filter((item) =>
            item.ref.id.startsWith("newItem_")
          ),
        ],
        [] as ItemType[]
      );

      const updatedLocalItems = {
        [list.ref.id]: items
          ?.concat(newItems)
          .filter((item) => item.ref.parent.parent?.id === list.ref.id)
          .sort((a, b) => a.data.order - b.data.order),
      };

      sections.forEach((section) => {
        updatedLocalItems[section.ref.id] = items
          ? items
              .concat(newItems)
              .filter((item) => item.ref.parent.parent?.id === section.ref.id)
              .sort((a, b) => a.data.order - b.data.order)
          : [];
      });

      setLocalItems(updatedLocalItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sections]);

  const deleteLocalItem = (item: ItemType) => {
    // delete item from localItems if name is empty & update order of other items
    setLocalItems((prev) => {
      const filteredItems = prev[item.ref.parent.parent!.id].filter(
        (i) => i.ref.id !== item.ref.id
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
        [item.ref.parent.parent!.id]: reorderedItems,
      };
    });
  };

  const addLocalItem = ({
    sectionId,
    order = localItems[sectionId || list.ref.id].length,
  }: {
    sectionId?: string;
    order?: number;
  }) => {
    const newItem = {
      ref: doc(
        db,
        sectionId
          ? `lists/${list.ref.id}/sections/${sectionId}/items`
          : `lists/${list.ref.id}/items`,
        `newItem_${new Date().getTime()}`
      ),
      data: createItemData({
        name: "",
        authorizedUsers: list.data.contributors
          ? [list.data.ownerID, ...list.data.contributors]
          : [list.data.ownerID],
        list,
        order,
      }),
    };

    // add new item locally & update order of other items
    setLocalItems((prev) => ({
      ...prev,
      [sectionId || list.ref.id]: [
        ...prev[sectionId || list.ref.id].slice(0, order),
        newItem,
        ...prev[sectionId || list.ref.id].slice(order).map((i) => {
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
        loading: loadingItems || loadingSections,
        error: errorItems || errorSections,
      }}
    >
      {children}
    </itemsContext.Provider>
  );
};

export const useItems = () => {
  return useContext(itemsContext);
};
