import { updateDoc } from "firebase/firestore";
import { MouseEvent, Dispatch, SetStateAction, useState } from "react";
import { List } from "../../types/types";
import { Modal } from "../utils/Modal";

const RenameListModal = ({
  list,
  setShowShareModal,
}: {
  list: List;
  setShowShareModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const [listTitle, setListTitle] = useState(list.data.name);

  const handleRename = (e: MouseEvent) => {
    e.preventDefault();
    if (listTitle && listTitle !== list.data.name) {
      updateDoc(list.ref, { name: listTitle });
      setShowShareModal(false);
      console.log("rename");
    }
  };

  return (
    <Modal setOpenModal={setShowShareModal}>
      {/* TODO: add validation */}
      <form>
        <label htmlFor="listTitle">Title:</label>
        <input
          autoFocus
          type="text"
          name="listTitle"
          value={listTitle}
          onChange={(e) => setListTitle(e.target.value)}
        />
        <input type="submit" value="Submit" onClick={handleRename} />
      </form>
    </Modal>
  );
};

export { RenameListModal };
