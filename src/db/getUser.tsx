import { verifyAuthToken } from "auth/verifyAuthToken";

export const getUser = async () => {
  const { user } = await verifyAuthToken();
  return JSON.stringify({ user });
};
