import { addDoc } from "firebase/firestore";
import router from "next/router";
import { Dispatch, SetStateAction, useState } from "react";
import { useAuth } from "../../firebase/authContext";
import {
  createItemData,
  createListData,
  createSectionData,
} from "../../firebase/factory";
import { itemsOfList, lists, sectionsOfList } from "../../firebase/useDb";
import { AdminList } from "../../types/types";
import { Modal } from "../utils/Modal";

const AddNamePicker = ({
  activeList,
  type,
  setShowAddMenu,
}: {
  activeList: AdminList;
  type: "item" | "section" | "list";
  setShowAddMenu: Dispatch<SetStateAction<boolean>>;
}) => {
  const { user } = useAuth();
  const [name, setName] = useState("");

  const clickHandler = async (
    e: React.MouseEvent<HTMLInputElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (user)
      switch (type) {
        case "item": {
          // instead of creating an item, only add an empty line to the list of
          // items with focus on the input field
          // add the item on enter or click outside of the input field or on
          // blur, but only if the input field is not empty

          addDoc(
            itemsOfList(activeList),
            createItemData({
              name: name === "" ? `new ${type}` : name,
              authorizedUsers: activeList.data.contributors
                ? [activeList.data.ownerID, ...activeList.data.contributors]
                : [activeList.data.ownerID],
              list: activeList,
            })
          );
          break;
        }
        case "list": {
          const newList = await addDoc(
            lists,
            createListData(name === "" ? `new ${type}` : name, user)
          );
          router.push(`/lists/${newList.id}`);
          break;
        }
        case "section": {
          addDoc(
            sectionsOfList(activeList),
            createSectionData({
              name: name === "" ? `new ${type}` : name,
              authorizedUsers: activeList.data.contributors
                ? [activeList.data.ownerID, ...activeList.data.contributors]
                : [activeList.data.ownerID],
            })
          );
          break;
        }
        default:
          break;
      }
    setShowAddMenu(false);
  };

  // TODO: add validation
  // TODO: add status message
  // TODO: add close button
  return (
    <Modal setOpenModal={setShowAddMenu} title={`New ${type}`} center={false}>
      <form>
        <label htmlFor="name">Name:</label>
        <input
          autoFocus
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input type="submit" value="Submit" onClick={clickHandler} />
      </form>
    </Modal>
  );
};

export { AddNamePicker };
