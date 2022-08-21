import { addDoc } from "firebase/firestore";
import router from "next/router";
import { Dispatch, SetStateAction, useState } from "react";
import { useAuth } from "../firebase/authContext";
import {
  createItemData,
  createListData,
  createSectionData,
} from "../firebase/factory";
import { itemsOfList, lists, sectionsOfList } from "../firebase/useDb";
import { List } from "../types/types";
import { Modal } from "./utils/Modal";

const AddNamePicker = ({
  activeList,
  type,
  setShowAddMenu,
}: {
  activeList: List;
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
          addDoc(
            itemsOfList(activeList),
            createItemData(name === "" ? `new ${type}` : name, user)
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
            createSectionData(name === "" ? `new ${type}` : name, user)
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
    <Modal setOpenModal={setShowAddMenu} title={`New ${type}`}>
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
