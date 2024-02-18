/// <reference lib="dom" />

import { describe, test, expect, beforeEach } from "bun:test";
import { render, screen } from "@tests/test-utils";
import { mockAuthWithUser, mockAuthWithoutUser } from "tests/mocks/authMocks";
import Page from "./page";

describe("main page without user", () => {
  beforeEach(async () => {
    mockAuthWithoutUser();
    render(await Page());
  });

  test("renders title", () => {
    expect(
      screen.queryByRole("heading", { name: "Shared Lists" })
    ).toBeDefined();
  });

  test("renders sign-in button", () => {
    expect(screen.queryByRole("button", { name: "sign in" })).not.toBeEmpty();
    expect(screen.queryByRole("button", { name: "sign out" })).toBeEmpty();
  });
});

describe("main page with user", () => {
  beforeEach(async () => {
    mockAuthWithUser();
    render(await Page());
  });

  test("renders sign-out button", async () => {
    expect(screen.queryByRole("button", { name: "sign in" })).toBeEmpty();
    expect(screen.queryByRole("button", { name: "sign out" })).not.toBeEmpty();
  });
});
