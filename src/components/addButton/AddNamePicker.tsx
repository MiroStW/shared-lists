import { useAuth } from "app/authContext";
import { addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { createListData, createSectionData } from "../../firebase/factory";
import { lists, sectionsOfList } from "../../firebase/useDb";
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
  const router = useRouter();

  const clickHandler = async (
    e: React.MouseEvent<HTMLInputElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (user)
      switch (type) {
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
