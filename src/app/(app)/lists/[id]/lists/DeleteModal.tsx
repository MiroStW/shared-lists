import { Loading } from "app/shared/Loading";
import { Modal } from "app/shared/Modal";
import { httpsCallable } from "firebase/functions";
import Router from "next/router";
import { AdminList, List, Section } from "types/types";
import { Dispatch, SetStateAction, useState } from "react";
import { functions } from "@firebase/firebase";

const DeleteModal = ({
  collection,
  setShowModal,
}: {
  collection: List | AdminList | Section;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const deleteHandler = () => {
    setIsDeleting(true);
    // need to add recursive delete
    const deleteFn = httpsCallable(functions, "recursiveDelete");
    deleteFn({ path: collection.ref.path })
      .then(() => {
        setShowModal(false);
        if (collection.ref.parent?.id === "lists") Router.push("/lists");
      })
      .catch((err) => {
        setError(err.message);
        setIsDeleting(false);
      });
    // add spinner and redirect to first list
    // maybe extract util function to be sahred between lists and sections
  };

  return (
    <Modal setOpenModal={setShowModal}>
      <>
        <p>
          Are you really sure you want to permanently delete{" "}
          {collection.data.name} including its items? This cannot be undone.
        </p>
        <button onClick={deleteHandler} disabled={isDeleting}>
          {!isDeleting ? (
            "delete"
          ) : (
            <>
              <Loading size={20} inline={true} /> deleting...
            </>
          )}
          {/* TODO: add inline flag to Loading comp, instead of absolute center */}
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
