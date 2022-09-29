import {
  documentId,
  endAt,
  orderBy,
  query,
  startAt,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { useAuth } from "../../firebase/authContext";
import {
  itemConverter,
  sectionConverter,
} from "../../firebase/firestoreConverter";
import { items as itemsCol, sectionsOfList } from "../../firebase/useDb";
import styles from "../../styles/items.module.css";
import { Item as ItemType, List, Section } from "../../types/types";
import { ItemArea } from "./ItemArea";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { ItemDndContext } from "./ItemDndContext";

const ItemAreaContainer = ({ list }: { list: List }) => {
  const { user } = useAuth();

  // IDEA: write to item all users who can access them in field
  // "authorisedUsers" on item creation and on contributor edit
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
    // alternative if nothing works: query items for list & sections
    // individually?
    // this would require a rule mandating to update contributor field on all
    // sub-items and sections, when contributor field is updated
  );
  const [sections, loadingSections, errorSections] = useCollection<Section>(
    query(
      sectionsOfList(list),
      where("ownerID", "==", user?.uid)
    ).withConverter(sectionConverter)
  );
  const [localItems, setLocalItems] = useState<{
    [key: string]: ItemType[];
  }>({});

  useEffect(() => {
    // console.log("sections: ", sections);
    console.log("localItems: ", localItems);
  }, [localItems]);

  useEffect(() => {
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
  }, [items, list.ref.id, sections]);

  return (
    <div className={styles.itemsArea}>
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
    </div>
  );
};
export { ItemAreaContainer };
