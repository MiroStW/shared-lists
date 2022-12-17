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
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { AdminList, Item as ItemType, Section } from "../types/types";
import { useAuth } from "./authContext";
import { createListData } from "./factory";
import {
  itemConverter,
  listConverter,
  sectionConverter,
} from "./firestoreConverter";
import { items as itemsCol, sectionsOfList } from "../firebase/useDb";
import { useCollection } from "react-firebase-hooks/firestore";

const itemsContext = createContext({
  items: [] as ItemType[],
  sections: [] as Section[],
  localItems: {} as { [key: string]: ItemType[] },
  setLocalItems: undefined as
    | Dispatch<SetStateAction<{ [key: string]: ItemType[] }>>
    | undefined,
  loading: true,
  error: undefined as FirestoreError | undefined,
});

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

  useEffect(() => {
    // console.log("list: ", list);
    // could add temporary item to localItems with doc() providing a
    // DocumentReference and createItemData() providing the data
    // that item would also need to be flagged somehow to be put in edit mode &
    // focus
    // how can the item be added from the addButton? move localItems to new
    // items context ?
    // Why am I not subscribing to items in the list?
    if (items) {
      const newLocalItems = {
        [list.ref.id]: items?.docs
          .map((item) => item.data())
          .filter((item) => item.ref.parent.parent?.id === list.ref.id),
      };

      sections?.docs
        .map((section) => section.data())
        .forEach((section) => {
          newLocalItems[section.ref.id] = items
            ? items.docs
                .map((item) => item.data())
                .filter((item) => item.ref.parent.parent?.id === section.ref.id)
            : [];
        });

      setLocalItems(newLocalItems);
    }
  }, [items, list, sections]);

  return (
    <itemsContext.Provider
      value={{
        items: items?.docs.map((item) => item.data()) || [],
        sections: sections?.docs.map((section) => section.data()) || [],
        localItems: localItems,
        setLocalItems: setLocalItems,
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
