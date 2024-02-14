/// <reference lib="dom" />

import { describe, test, expect, spyOn, beforeEach } from "bun:test";
import { render, screen } from "@tests/test-utils";
import { mockSignedInUser } from "@tests/mocks/authMocks";
import SignOutBtn from "./SignOutBtn";
import * as signOutHandlerModule from "./shared/signOutHandler";

describe("Header", () => {
  beforeEach(() => {
    mockSignedInUser();
    render(<SignOutBtn />);
  });

  test("renders sign-out button", () => {
    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button).toBeDefined();
  });

  test("signs out user on click", () => {
    const button = screen.getByRole("button", { name: /sign out/i });
    spyOn(signOutHandlerModule, "signOutHandler").mockReturnValue(
      Promise.resolve()
    );

    button.click();

    expect(signOutHandlerModule.signOutHandler).toHaveBeenCalledTimes(1);
  });
});
