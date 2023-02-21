"use client";

import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { AdminInvite } from "types/types";
import { db } from "db/useDb";
import { functions } from "@firebase/firebase";
import { useState } from "react";

const ShowInvite = ({ invite }: { invite: AdminInvite }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoinList = async (response: boolean) => {
    if (invite && response) {
      setLoading(true);

      const addAuthorizedUser = httpsCallable(functions, "addauthorizeduser");
      try {
        await addAuthorizedUser({ listId: invite.data.listID });
        updateDoc(doc(db, invite.ref.path), {
          status: response ? "accepted" : "declined",
        });
        router.push(`/lists/${invite?.data.listID}`);
      } catch (err: unknown) {
        if (typeof err === "string") {
          console.log("error", err);
          setError(err);
        } else if (err instanceof Error) {
          console.log("error", err.message);
          setError(err.message);
          setLoading(false);
        }
      }
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

          {error && <p style={{ color: "red" }}>{error}</p>}
          <p>
            <button onClick={() => handleJoinList(true)}>
              {loading ? "joining list..." : "accept"}
            </button>{" "}
            or
            <button onClick={() => handleJoinList(false)}>decline</button>
          </p>
        </>
      )}
    </>
  );
};

export default ShowInvite;
