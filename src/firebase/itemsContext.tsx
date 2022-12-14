import { doc, FirestoreError, orderBy, query, where } from "firebase/firestore";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { AdminList, Item as ItemType, Section } from "../types/types";
import { useAuth } from "./authContext";
import { itemConverter, sectionConverter } from "./firestoreConverter";
import { db, items as itemsCol, sectionsOfList } from "../firebase/useDb";
import { useCollection } from "react-firebase-hooks/firestore";
import { createItemData } from "./factory";

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
  list,
}: {
  children: ReactNode;
  list: AdminList;
}) => {
  const { user } = useAuth();

  const [items, loadingItems, errorItems] = useCollection<ItemType>(
    query(
      itemsCol,
      where("list", "==", list.ref.id),
      // orderBy(documentId()),
      // startAt(list.ref.path),
      // endAt(`${list.ref.path}\uf8ff`) // hack to get all subcollections of list
      where("authorizedUsers", "array-contains", user?.uid),
      orderBy("order", "asc")
    ).withConverter(itemConverter)
  );
  const [sections, loadingSections, errorSections] = useCollection<Section>(
    query(
      sectionsOfList(list),
      where("authorizedUsers", "array-contains", user?.uid)
    ).withConverter(sectionConverter)
  );
  const [localItems, setLocalItems] = useState<{
    [key: string]: ItemType[];
  }>({});

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
        [list.ref.id]: items?.docs
          .map((item) => item.data())
          .concat(newItems)
          .filter((item) => item.ref.parent.parent?.id === list.ref.id)
          .sort((a, b) => a.data.order - b.data.order),
      };

      sections?.docs
        .map((section) => section.data())
        .forEach((section) => {
          updatedLocalItems[section.ref.id] = items
            ? items.docs
                .map((item) => item.data())
                .concat(newItems)
                .filter((item) => item.ref.parent.parent?.id === section.ref.id)
                .sort((a, b) => a.data.order - b.data.order)
            : [];
        });

      setLocalItems(updatedLocalItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, list, sections]);

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
        items: items?.docs.map((item) => item.data()) || [],
        sections: sections?.docs.map((section) => section.data()) || [],
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
