import { redirect } from "next/navigation";
import { getServerSession } from "auth/getServerSession";
import { prisma } from "db/prisma";
import {
  listAgentAccesses,
  listHouseholdCandidates,
} from "server/auth/agentAccess";
import { AgentAccessSettings } from "./AgentAccessSettings";

export const dynamic = "force-dynamic";

const AgentAccessPage = async () => {
  const { user } = await getServerSession();
  if (!user?.id) redirect("/signin");

  const [me, accesses, candidates] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }),
    listAgentAccesses(user.id),
    listHouseholdCandidates(user.id),
  ]);
  if (!me) redirect("/signin");

  return (
    <AgentAccessSettings
      userEmail={me.email}
      initialAccesses={accesses}
      candidates={candidates}
    />
  );
};

export default AgentAccessPage;
