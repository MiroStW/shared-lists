import { addDoc } from "firebase/firestore";
import { Dispatch, MouseEventHandler, SetStateAction, useState } from "react";
import { useAuth } from "../firebase/authContext";
import { createItemData } from "../firebase/factory";
import { itemsOfList } from "../firebase/useDb";
import { List } from "../types/types";

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
    if (user) addDoc(itemsOfList(activeList), createItemData(name, user));
    setShowAddMenu(false);
  };

  return (
    <>
      <div className="modal">
        <form>
          <label>
            Name of new {type}:
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <input type="submit" value="Submit" onClick={clickHandler} />
        </form>
      </div>
      <div className="backdrop"></div>
    </>
  );
};

export { AddNamePicker };
