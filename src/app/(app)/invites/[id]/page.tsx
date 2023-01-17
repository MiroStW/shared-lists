import { AdminInvite } from "types/types";
import { adminDb } from "@firebase/firebaseAdmin";
import ShowInvite from "./ShowInvite";
import { ShowError } from "app/shared/ShowError";

// going forward invites could become a modal on the lists page

const getInvite = async (id: string) => {
  const inviteSnap = await adminDb().collection("invites").doc(id).get();

  if (inviteSnap.exists) {
    const inviteDoc = {
      data: inviteSnap.data(),
      ref: {
        ...inviteSnap.ref,
        id: inviteSnap.id,
        parent: {
          ...inviteSnap.ref.parent,
          id: inviteSnap.ref.parent.id,
        },
        path: inviteSnap.ref.path,
      },
    } as AdminInvite;
    return JSON.stringify(inviteDoc);
  } else return null;
};

const page = async ({ params }: { params: { id: string } }) => {
  const serializedInvite = await getInvite(params.id);
  if (!serializedInvite) return <ShowError msg="Invite not found" />;
  const invite = JSON.parse(serializedInvite) as AdminInvite;

  return <ShowInvite invite={invite} />;
};

export default page;
