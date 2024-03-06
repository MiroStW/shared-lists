import { describe, test, expect, spyOn, beforeEach } from "bun:test";
import { render, screen } from "@tests/test-utils";
import SignOutBtn from "./SignOutBtn";
import * as signOutHandlerModule from "./shared/signOutHandler";
import { mockAuthWithUser } from "@tests/mocks/authMocks";

describe("Sign-out button", () => {
  beforeEach(() => {
    mockAuthWithUser();
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
