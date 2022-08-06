import { addDoc } from "firebase/firestore";
import { Dispatch, SetStateAction, useState } from "react";
import { useAuth } from "../firebase/authContext";
import { createItemData } from "../firebase/factory";
import { itemsOfList } from "../firebase/useDb";
import { List } from "../types/types";
import styles from "../styles/addNamePicker.module.css";
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

  const clickHandler = (e: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
    e.preventDefault();
    if (user)
      addDoc(
        itemsOfList(activeList),
        createItemData(name === "" ? `new ${type}` : name, user)
      );
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
