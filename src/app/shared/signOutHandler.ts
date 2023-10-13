import { Auth, signOut } from "firebase/auth";

export const signOutHandler = async (auth: Auth) => {
  signOut(auth);
  try {
    const data = await fetch("/api/revokesession");
    const res = await data.json();
    console.log("signOutHandler: ", res);
  } catch (err) {
    console.error("signOutHandler: ", err);
  }
};
