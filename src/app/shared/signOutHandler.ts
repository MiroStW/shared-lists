import { Auth, signOut } from "firebase/auth";

export const signOutHandler = async (auth: Auth) => {
  try {
    await fetch("/api/revokesession");
    await signOut(auth);
    sessionStorage.removeItem(
      `firebase:authUser:${auth.app.options.apiKey}:[DEFAULT]`
    );
  } catch (err) {
    console.error("signOutHandler: ", err);
  }
};
