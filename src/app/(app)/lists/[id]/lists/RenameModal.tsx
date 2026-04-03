"use client";

import { Modal } from "app/shared/Modal";
import { MouseEvent, Dispatch, SetStateAction, useState } from "react";
import { AdminList, List, Section } from "types/types";
import { useRouter } from "next/navigation";

const RenameModal = ({
  collection,
  setShowModal,
}: {
  collection: List | AdminList | Section;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const [collectionTitle, setCollectionTitle] = useState(collection.data.name);
  const router = useRouter();

  const handleRename = async (e: MouseEvent) => {
    e.preventDefault();
    if (collectionTitle && collectionTitle !== collection.data.name) {
      const isSection = 'listId' in collection.data;
      const endpoint = isSection
        ? `/api/sections/${collection.id}`
        : `/api/lists/${collection.id}`;

      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: collectionTitle }),
      });

      router.refresh();
      setShowModal(false);
    }
  };

  return (
    <Modal setOpenModal={setShowModal}>
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
