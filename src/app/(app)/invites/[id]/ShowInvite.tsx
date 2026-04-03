"use client";

import { useRouter } from "next/navigation";
import { AdminInvite } from "types/types";
import { useState } from "react";

const ShowInvite = ({ invite }: { invite: AdminInvite }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoinList = async (response: boolean) => {
    if (invite && response) {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/invites/${invite.id}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to join list");
        }

        router.push(`/lists/${invite.data.listID}`);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    } else {
        router.push("/lists");
    }
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
