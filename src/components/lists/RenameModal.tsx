import { doc, updateDoc } from "firebase/firestore";
import { MouseEvent, Dispatch, SetStateAction, useState } from "react";
import { db } from "../../firebase/useDb";
import {
  AdminList,
  List,
  ListData,
  Section,
  SectionData,
} from "../../types/types";
import { Modal } from "../utils/Modal";

const RenameModal = ({
  collection,
  setShowModal,
}: {
  collection: List | AdminList | Section;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const [collectionTitle, setCollectionTitle] = useState(collection.data.name);

  const handleRename = (e: MouseEvent) => {
    e.preventDefault();
    if (collectionTitle && collectionTitle !== collection.data.name) {
      updateDoc(doc(db, collection.ref.path), {
        name: collectionTitle,
      });
      setShowModal(false);
      console.log("rename");
    }
  };

  return (
    <Modal setOpenModal={setShowModal}>
      {/* TODO: add validation */}
      <form>
        <label htmlFor="listTitle">Title:</label>
        <input
          autoFocus
          type="text"
          name="listTitle"
          value={collectionTitle}
          onChange={(e) => setCollectionTitle(e.target.value)}
        />
        <input type="submit" value="Submit" onClick={handleRename} />
      </form>
    </Modal>
  );
};

export { RenameModal };
