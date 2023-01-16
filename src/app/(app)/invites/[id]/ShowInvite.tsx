"use client";

import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { AdminInvite } from "types/types";
import { db } from "db/useDb";
import { functions } from "@firebase/firebase";

const ShowInvite = ({ invite }: { invite: AdminInvite }) => {
  const router = useRouter();

  const handleJoinList = async (response: boolean) => {
    if (invite && response) {
      updateDoc(doc(db, invite.ref.path), {
        status: response ? "accepted" : "declined",
      });

      const addAuthorizedUser = httpsCallable<
        { listId: string },
        { listId: string; userId: string; updatedRecords: number }
      >(functions, "addAuthorizedUser");
      addAuthorizedUser({ listId: invite.data.listID });

      router.push(`/lists/${invite?.data.listID}`);
    } else router.push("/lists");
  };

  return (
    <>
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
    </>
  );
};

export default ShowInvite;
