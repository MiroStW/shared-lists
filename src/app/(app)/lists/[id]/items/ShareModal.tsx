import { Modal } from "app/shared/Modal";
import { useClientSession } from "app/sessionContext";
import { Dispatch, SetStateAction, useState } from "react";
import { AdminList } from "types/types";

const ShareModal = ({
  list,
  setShowShareModal,
}: {
  list: AdminList;
  setShowShareModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const { user } = useClientSession();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && email) {
      setIsLoading(true);
      try {
        await fetch("/api/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteeEmail: email, listId: list.id }),
        });
        setShowShareModal(false);
      } catch (err) {
        console.error("Failed to share:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Modal
      setOpenModal={setShowShareModal}
      title={`Who do you want to share ${list.data.name} with?`}
    >
      <form onSubmit={handleShare}>
        <label htmlFor="inviteeEmail">E-Mail:</label>
        <input
          autoFocus
          type="text"
          name="inviteeEmail"
          placeholder="share@with.me"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input type="submit" value={isLoading ? "Sharing..." : "Submit"} disabled={isLoading} />
      </form>
    </Modal>
  );
};

export { ShareModal };
