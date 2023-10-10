import { Auth, signOut } from "firebase/auth";

export const signOutHandler = async (auth: Auth) => {
  signOut(auth);
  try {
    const data = await fetch("/api/revokesession");
    const res = data.json();
    console.log("revoked session", res);
  } catch (err) {
    console.error("fetch error: ", err);
  }
};
