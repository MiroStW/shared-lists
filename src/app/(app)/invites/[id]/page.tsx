import { prisma } from "db/prisma";
import ShowInvite from "./ShowInvite";
import { ShowError } from "app/shared/ShowError";
import { AdminInvite } from "types/types";

const getInvite = async (id: string) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { id },
    });

    if (invite) {
      return {
        id: invite.id,
        data: {
          inviterID: invite.inviterID,
          inviterName: invite.inviterName,
          inviteeEmail: invite.inviteeEmail,
          listID: invite.listID,
          listName: invite.listName,
          status: invite.status,
          createdDate: invite.createdDate.toISOString(),
        }
      } as AdminInvite;
    }
    return null;
  } catch (error) {
    console.error("Error fetching invite:", error);
    return null;
  }
};

const page = async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const invite = await getInvite(params.id);
  if (!invite) return <ShowError msg="Invite not found" />;

  return <ShowInvite invite={invite} />;
};

export default page;
