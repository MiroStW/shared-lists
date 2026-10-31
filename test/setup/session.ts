import { afterEach, mock } from "bun:test";
import type { Session } from "next-auth";

// Preloaded by bunfig.toml, so the mock is in place before any test file
// imports a route. Route tests pick the signed-in user with setSessionUser();
// it is cleared after every test.
type SessionUser = Session["user"];

let currentUser: SessionUser | null = null;

export const setSessionUser = (user: SessionUser | null) => {
  currentUser = user;
};

const getServerSession = async () =>
  currentUser ? { user: currentUser } : { error: "No user found" };

mock.module("auth/getServerSession", () => ({
  getServerSession,
  default: getServerSession,
}));

afterEach(() => setSessionUser(null));
