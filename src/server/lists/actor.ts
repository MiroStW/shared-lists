// Who performs a list operation (KTD2). Members decide visibility: a list is
// visible when every member owns it or contributes to it. A person is a single
// member; a household is several members and sees only their intersection.
export type CommandOrigin = "web" | "v1" | "tool" | "agent";

export type Actor = {
  memberUserIds: string[];
  // The person behind the call. Always the single member for a person; for a
  // household optional and, when set, one of the members.
  actingUserId: string | null;
  accessId: string | null;
  // The channel label, e.g. "web", "v1" or an agent access label.
  channel: string;
  origin: CommandOrigin;
  // The browser tab that caused a change, so it can ignore its own live update.
  clientId?: string | null;
};

type ActorOptions = {
  channel?: string;
  origin?: CommandOrigin;
  accessId?: string | null;
  clientId?: string | null;
};

export const personActor = (
  userId: string,
  {
    channel = "web",
    origin = "web",
    accessId = null,
    clientId = null,
  }: ActorOptions = {},
): Actor => ({
  memberUserIds: [userId],
  actingUserId: userId,
  accessId,
  channel,
  origin,
  clientId,
});

export const householdActor = (
  memberUserIds: string[],
  {
    actingUserId = null,
    accessId,
    channel,
    origin = "tool",
    clientId = null,
  }: {
    actingUserId?: string | null;
    accessId: string | null;
    channel: string;
    origin?: CommandOrigin;
    clientId?: string | null;
  },
): Actor => ({
  memberUserIds: [...memberUserIds],
  actingUserId,
  accessId,
  channel,
  origin,
  clientId,
});
