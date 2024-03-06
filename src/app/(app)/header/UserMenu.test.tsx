import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import { render, screen } from "@tests/test-utils";
import { defaultUserInfoMock, mockAuthWithUser } from "@tests/mocks/authMocks";
import * as ImageModule from "next/image";
import { UserMenu } from "./UserMenu";
import { UserInfo } from "firebase-admin/auth";

const setupComponent = (userInfo?: Partial<UserInfo>) => {
  mockAuthWithUser({
    ...defaultUserInfoMock,
    ...userInfo,
    toJSON: () => {
      return {};
    },
  });
  render(<UserMenu />);
};

describe("UserMenu", () => {
  beforeEach(() => {
    spyOn(ImageModule, "default").mockReturnValue(
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="profile picture" />
    );
  });

  test("renders user image", () => {
    setupComponent();
    expect(screen.getByAltText("profile picture")).toBeDefined();
    expect(screen.queryByText("mt")).toBeNull();
  });

  test("renders user initials", () => {
    setupComponent({ photoURL: "" });
    expect(screen.getByText("mt")).toBeDefined();
    expect(screen.queryByAltText("profile picture")).toBeNull();
  });

  test("renders sign out button", () => {
    setupComponent();
    expect(screen.getByText("sign out")).toBeDefined();
  });
});
