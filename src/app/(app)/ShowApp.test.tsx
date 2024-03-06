import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import { render, screen } from "@tests/test-utils";
import ShowApp from "./ShowApp";
import * as ImageModule from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "app/sessionContext";

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

  render(<ShowApp />);
  screen.debug();
  return { user, fetchSpy };
};

describe("ShowApp", () => {
  beforeEach(() => {
    spyOn(ImageModule, "default").mockReturnValue(
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="profile picture" />
    );
    setupComponent({});
  });

  test("renders header", () => {
    expect(
      screen.findByRole("heading", { name: /shared-list/i })
    ).toBeDefined();
  });

  test("renders lists header", () => {
    expect(screen.findByRole("heading", { name: /lists/i })).toBeDefined();
  });
});
