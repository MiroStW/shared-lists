/// <reference lib="dom" />

import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import { render, screen } from "@tests/test-utils";
import { defaultUserInfoMock, mockAuthWithUser } from "@tests/mocks/authMocks";
import ShowApp from "./ShowApp";
import * as ImageModule from "next/image";
import { UserInfo } from "firebase-admin/auth";

const setupComponent = (userInfo?: Partial<UserInfo>) => {
  mockAuthWithUser({
    ...defaultUserInfoMock,
    ...userInfo,
    toJSON: () => {
      return {};
    },
  });

  render(<ShowApp />);
};

describe("ShowApp", () => {
  beforeEach(() => {
    spyOn(ImageModule, "default").mockReturnValue(
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="profile picture" />
    );
    setupComponent();
  });

  test("renders header", () => {
    expect(screen.getByRole("heading", { name: /shared-list/i })).toBeDefined();
  });
});
