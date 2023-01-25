import { Loading } from "app/shared/Loading";
import { Modal } from "app/shared/Modal";
import { httpsCallable } from "firebase/functions";
import { AdminList, List, Section } from "types/types";
import { Dispatch, SetStateAction, useState } from "react";
import { functions } from "@firebase/firebase";
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
    // need to add recursive delete
    const deleteFn = httpsCallable(functions, "recursiveDelete");
    try {
      await deleteFn({ path: collection.ref.path });
      setShowModal(false);
      if (collection.ref.parent?.id === "lists") router.push("/lists");
    } catch (err: unknown) {
      if (typeof err === "string") {
        console.log("error", err);
        setError(err);
      } else if (err instanceof Error) {
        console.log("error", err.message);
        setError(err.message);
      }
      setIsDeleting(false);
    }

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
