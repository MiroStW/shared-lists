import { orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { useAuth } from "../../firebase/authContext";
import {
  itemConverter,
  sectionConverter,
} from "../../firebase/firestoreConverter";
import { items as itemsCollection, sectionsOfList } from "../../firebase/useDb";
import styles from "../../styles/items.module.css";
import { Item as ItemType, List, Section } from "../../types/types";
import { ItemArea } from "./ItemArea";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { ItemDndContext } from "./ItemDndContext";

const ItemAreaContainer = ({ list }: { list: List }) => {
  const { user } = useAuth();
  const [items, loadingItems, errorItems] = useCollection<ItemType>(
    query(
      itemsCollection,
      where("list", "==", list.ref.id),
      where("ownerID", "==", user?.uid),
      orderBy("order", "asc")
    ).withConverter(itemConverter)
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
          <ItemDndContext
            list={list}
            sections={sections!.docs.map((section) => section.data())}
            localItems={localItems}
            setLocalItems={setLocalItems}
            items={items!.docs.map((item) => item.data())}
          >
            <ItemArea
              list={list}
              sections={sections!.docs.map((section) => section.data())}
              items={localItems}
            />
          </ItemDndContext>
        </>
      )}
    </div>
  );
};
export { ItemAreaContainer };
