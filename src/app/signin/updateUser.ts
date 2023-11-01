import { Auth, User } from "firebase/auth";

export const updateUser = async (user: User, auth: Auth) => {
  const idToken = await user.getIdToken();
  const response = await fetch(`/api/sessionlogin?idToken=${idToken}`);
  if (!response.ok)
    throw new Error(`Session creation failed: ${response.statusText}`);
  await auth.updateCurrentUser(user);
};
