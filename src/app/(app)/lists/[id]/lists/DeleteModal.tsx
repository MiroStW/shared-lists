"use client";

import { Loading } from "app/shared/Loading";
import { Modal } from "app/shared/Modal";
import { AdminList, List, Section } from "types/types";
import { Dispatch, SetStateAction, useState } from "react";
import { useRouter } from "next/navigation";

const DeleteModal = ({
  collection,
  setShowModal,
}: {
  collection: List | AdminList | Section;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const deleteHandler = async () => {
    setIsDeleting(true);
    setError("");

    try {
      // Determine if it's a list or a section
      // In the new structure, sections have listId, lists have ownerID
      const isSection = 'listId' in collection.data;
      const endpoint = isSection
        ? `/api/sections/${collection.id}`
        : `/api/lists/${collection.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Deletion failed");
      }

      setShowModal(false);
      if (!isSection) {
        router.push("/lists");
      } else {
          // If it's a section, we might need to refresh the page/context
          router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setIsDeleting(false);
    }
  };

  return (
    <Modal setOpenModal={setShowModal}>
      <>
        <p>
          Are you really sure you want to permanently delete{" "}
          {collection.data.name} including its items? This cannot be undone.
        </p>
        <br />
        <button
          onClick={deleteHandler}
          disabled={isDeleting}
          className={"noMargin"}
        >
          {!isDeleting ? (
            "delete"
          ) : (
            <>
              <Loading size={20} inline={true} /> deleting...
            </>
          )}
        </button>
        {error && (
          <p style={{ color: "red" }}>
            Oh no, something didn&apos;t work: {error}
          </p>
        )}
      </>
    </Modal>
  );
};

export { DeleteModal };
