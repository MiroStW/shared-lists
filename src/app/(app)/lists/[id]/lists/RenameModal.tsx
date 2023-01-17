import { Modal } from "app/shared/Modal";
import { db } from "db/useDb";
import { doc, updateDoc } from "firebase/firestore";
import { MouseEvent, Dispatch, SetStateAction, useState } from "react";
import { AdminList, List, Section } from "types/types";

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
