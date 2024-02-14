/// <reference lib="dom" />

import { describe, test, expect, beforeEach } from "bun:test";
import { render } from "@tests/test-utils";
import SignOutBtn from "./SignOutBtn";
import { mockSignedInUser } from "tests/mocks/authMocks";

describe("Header", () => {
  beforeEach(() => {
    mockSignedInUser();
  });

  test("2 + 2", () => {
    expect(2 + 2).toBe(4);
  });
  test("renders sign-out button", () => {
    const { container } = render(<SignOutBtn />);
    expect(container).toBeDefined();
  });
});
