import { orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { useAuth } from "../../firebase/authContext";
import {
  itemConverter,
  sectionConverter,
} from "../../firebase/firestoreConverter";
import { items as itemsCol, sectionsOfList } from "../../firebase/useDb";
import { AdminList, Item as ItemType, Section } from "../../types/types";
import { ItemArea } from "./ItemArea";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { ItemDndContext } from "./ItemDndContext";

const ItemAreaContainer = ({ list }: { list: AdminList }) => {
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
    <>
      {errorItems && <Error msg={errorItems.message} />}
      {errorSections && <Error msg={errorSections.message} />}
      {loadingItems || loadingSections ? (
        <Loading />
      ) : (
        <>
          {items && sections && (
            <ItemDndContext
              list={list}
              sections={sections.docs.map((section) => section.data())}
              localItems={localItems}
              setLocalItems={setLocalItems}
              items={items.docs.map((item) => item.data())}
            >
              <ItemArea
                list={list}
                sections={sections.docs.map((section) => section.data())}
                items={localItems}
              />
            </ItemDndContext>
          )}
        </>
      )}
    </>
  );
};
export { ItemAreaContainer };
