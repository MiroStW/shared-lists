import { useAuth } from "app/authContext";
import { updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { Invite } from "types/types";
import { functions } from "../../../../firebase/firebase";

const ShowInvite = ({ invite }: { invite: Invite }) => {
  const router = useRouter();
  const { user } = useAuth();

  const handleJoinList = async (response: boolean) => {
    if (invite && response) {
      updateDoc(invite.ref, { status: response ? "accepted" : "declined" });

      const addAuthorizedUser = httpsCallable(functions, "addAuthorizedUser");
      addAuthorizedUser({ listId: invite.data.listID, userId: user?.uid });

      router.push(`/lists/${invite?.data.listID}`);
    } else router.push("/lists");
  };

  return (
    // TODO: handle 404 invite not found?
    <>
      <div
        style={{
          position: "relative",
          flex: "1",
          paddingRight: "18px",
          paddingLeft: "18px",
        }}
      >
        {invite?.data.status === "accepted" ? (
          <p>Invite already {invite?.data.status}</p>
        ) : (
          <>
            <h2>Invite</h2>
            <p>
              You were invited by {invite?.data.inviterName} to join the list
              &ldquo;{invite?.data.listName}&rdquo;.
            </p>
            <p>
              <button onClick={() => handleJoinList(true)}>accept</button> or
              <button onClick={() => handleJoinList(false)}>decline</button>
            </p>
          </>
        )}
      </div>
    </>
  );
};

export default ShowInvite;
