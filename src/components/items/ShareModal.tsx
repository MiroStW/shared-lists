import { addDoc } from "firebase/firestore";
import { Dispatch, SetStateAction } from "react";
import { useAuth } from "../../firebase/authContext";
import { createInviteData } from "../../firebase/factory";
import { invites } from "../../firebase/useDb";
import { List } from "../../types/types";
import { Modal } from "../utils/Modal";

const ShareModal = ({
  list,
  setShowShareModal,
}: {
  list: List;
  setShowShareModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const { user } = useAuth();
  const handleShare = (inviteeEmail: string) => {
    if (user) addDoc(invites, createInviteData(user, inviteeEmail, list));
  };

  return (
    <Modal setOpenModal={setShowShareModal}>
      <>test</>
    </Modal>
  );
};

export { ShareModal };
