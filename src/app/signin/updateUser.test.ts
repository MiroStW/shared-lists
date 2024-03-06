/// <reference lib="dom" />

import { describe, test, expect, spyOn } from "bun:test";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "app/sessionContext";
import { updateUser } from "app/signin/updateUser";

const setupComponent = async ({
  username = "test@test.de",
  password = "Aa123456",
}: {
  username?: string;
  password?: string;
}) => {
  const fetchSpy = spyOn(window, "fetch").mockReturnValue(
    Promise.resolve(new Response(JSON.stringify("session created")))
  );

  const { user } = await signInWithEmailAndPassword(auth, username, password);
  const response = await updateUser(user, auth);

  return { user, response, fetchSpy };
};

describe("updateUser", () => {
  test("calls session-login api with idToken", async () => {
    const { user, fetchSpy, response } = await setupComponent({});
    const idToken = await user.getIdToken();
    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/sessionlogin?idToken=${idToken}`
    );
    expect(response.ok).toBeTrue();
  });

  test("it throws when token is incorrect", async () => {
    expect(async () => {
      await setupComponent({ password: "wrongPassword" });
    }).toThrow();
  });
});
