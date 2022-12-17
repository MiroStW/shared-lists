import { useAuth } from "../../firebase/authContext";
import { AdminList } from "../../types/types";
import { ItemArea } from "./ItemArea";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { ItemDndContext } from "./ItemDndContext";
import { useItems } from "../../firebase/itemsContext";

// THIS COMPONENT IS NOT USED ANYMORE?

const ItemAreaContainer = ({ list }: { list: AdminList }) => {
  const { items, sections, localItems, setLocalItems, loading, error } =
    useItems();

  // const [items, loadingItems, errorItems] = useCollection<ItemType>(
  //   query(
  //     itemsCol,
  //     where("list", "==", list.ref.id),
  //     // orderBy(documentId()),
  //     // startAt(list.ref.path),
  //     // endAt(`${list.ref.path}\uf8ff`) // hack to get all subcollections of list
  //     where("authorizedUsers", "array-contains", user?.uid),
  //     orderBy("order", "asc")
  //   ).withConverter(itemConverter)
  // );
  // const [sections, loadingSections, errorSections] = useCollection<Section>(
  //   query(
  //     sectionsOfList(list),
  //     where("authorizedUsers", "array-contains", user?.uid)
  //   ).withConverter(sectionConverter)
  // );
  // const [localItems, setLocalItems] = useState<{
  //   [key: string]: ItemType[];
  // }>({});

  // useEffect(() => {
  //   // console.log("list: ", list);
  //   // could add temporary item to localItems with doc() providing a
  //   // DocumentReference and createItemData() providing the data
  //   // that item would also need to be flagged somehow to be put in edit mode &
  //   // focus
  //   // how can the item be added from the addButton? move localItems to new
  //   // items context ?
  //   if (items) {
  //     const newLocalItems = {
  //       [list.ref.id]: items?.docs
  //         .map((item) => item.data())
  //         .filter((item) => item.ref.parent.parent?.id === list.ref.id),
  //     };

  //     sections?.docs
  //       .map((section) => section.data())
  //       .forEach((section) => {
  //         newLocalItems[section.ref.id] = items
  //           ? items.docs
  //               .map((item) => item.data())
  //               .filter((item) => item.ref.parent.parent?.id === section.ref.id)
  //           : [];
  //       });

  //     setLocalItems(newLocalItems);
  //   }
  // }, [items, list, sections]);

  return (
    <>
      {error && <Error msg={error.message} />}
      {loading ? (
        <Loading />
      ) : (
        <>
          {items && sections && setLocalItems && (
            <ItemDndContext
              list={list}
              sections={sections}
              localItems={localItems}
              setLocalItems={setLocalItems}
              items={items}
            >
              <ItemArea list={list} sections={sections} items={localItems} />
            </ItemDndContext>
          )}
        </>
      )}
    </>
  );
};
export { ItemAreaContainer };
