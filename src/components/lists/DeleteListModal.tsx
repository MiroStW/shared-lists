import { httpsCallable } from "firebase/functions";
import Router from "next/router";
import { Dispatch, SetStateAction, useState } from "react";
import { functions } from "../../firebase/firebase";
import { List } from "../../types/types";
import { Loading } from "../utils/Loading";
import { Modal } from "../utils/Modal";

const DeleteListModal = ({
  list,
  setShowModal,
}: {
  list: List;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteHandler = () => {
    setIsDeleting(true);
    // need to add recursive delete
    const deleteFn = httpsCallable(functions, "recursiveDelete");
    deleteFn({ path: list.ref.path })
      .then((result) => {
        console.log(`Delete success: ${JSON.stringify(result)}`);
        setShowModal(false);
        Router.push("/lists");
      })
      .catch((err) => {
        console.log("Delete failed, see console,");
        console.warn(err);
      });

    // add spinner and redirect to first list
    // maybe extract util function to be sahred between lists and sections
  };

  return (
    <Modal setOpenModal={setShowModal}>
      <>
        <p>
          Are you really sure you want to delete the whole list including all
          sections and items? This cannot be undone.
        </p>
        <button onClick={deleteHandler} disabled={isDeleting}>
          {!isDeleting ? "delete list" : <Loading size={20} />}
          {/* TODO: add inline flag to Loading comp, instead of absolute center */}
        </button>
      </>
    </Modal>
  );
};

export { DeleteListModal };
