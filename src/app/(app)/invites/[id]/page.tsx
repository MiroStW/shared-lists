import { doc, getDoc } from "firebase/firestore";
import { Error as ErrorComp } from "../../../../components/utils/Error";
import { inviteConverter } from "../../../../firebase/firestoreConverter";
import { invites } from "../../../../firebase/useDb";
import { Invite } from "../../../../types/types";
import ShowInvite from "./ShowInvite";

// going forward invites could become a modal on the lists page

const getInvite = async (id: string) => {
  const inviteDoc = await getDoc(
    doc(invites, `${id}`).withConverter(inviteConverter)
  );
  if (inviteDoc.exists()) {
    return JSON.stringify(inviteDoc.data());
  } else return null;
};

const page = async ({ params }: { params: { id: string } }) => {
  const serializedInvite = await getInvite(params.id);
  if (!serializedInvite) return <ErrorComp msg="Invite not found" />;
  const invite = JSON.parse(serializedInvite) as Invite;

  return <ShowInvite invite={invite} />;
};

export default page;
