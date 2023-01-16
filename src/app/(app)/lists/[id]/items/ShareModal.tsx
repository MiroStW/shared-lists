import { Modal } from "app/(app)/shared/Modal";
import { useAuth } from "app/authContext";
import { createInviteData } from "db/factory";
import { invites } from "db/useDb";
import { addDoc } from "firebase/firestore";
import { Dispatch, SetStateAction, useState } from "react";
import { AdminList } from "types/types";

const ShareModal = ({
  list,
  setShowShareModal,
}: {
  list: AdminList;
  setShowShareModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const handleShare = (e: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
    e.preventDefault();
    if (user && email) {
      addDoc(invites, createInviteData(user, email, list));
      // const sendEmail = httpsCallable(functions, "sendEmail");
      // sendEmail()
      //   .then((result) => console.log("result: ", result))
      //   .catch((error) => console.log("error: ", error));
      setShowShareModal(false);
    }
  };

  return (
    <Modal
      setOpenModal={setShowShareModal}
      title={`Who do you want to share ${list.data.name} with?`}
    >
      {/* TODO: add validation */}
      <form>
        <label htmlFor="inviteeEmail">E-Mail:</label>
        <input
          autoFocus
          type="text"
          name="inviteeEmail"
          placeholder="share@with.me"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input type="submit" value="Submit" onClick={handleShare} />
      </form>
    </Modal>
  );
};

export { ShareModal };