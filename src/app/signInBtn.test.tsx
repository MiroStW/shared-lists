import { describe, test, expect, beforeEach } from "bun:test";
import { render, screen } from "@tests/test-utils";
import { mockAuthWithUser } from "@tests/mocks/authMocks";
import SignInBtn from "./SignInBtn";

describe("Sign-in button", () => {
  beforeEach(() => {
    mockAuthWithUser();
    render(<SignInBtn />);
  });

  test("renders sign-in button", () => {
    const button = screen.getByRole("button", { name: /sign in/i });
    expect(button).toBeDefined();
  });
});
