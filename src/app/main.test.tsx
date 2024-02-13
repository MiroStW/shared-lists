/// <reference lib="dom" />

import { describe, test, expect, beforeEach, jest, mock } from "bun:test";
import { render } from "../../test-utils";
import SignOutBtn from "./SignOutBtn";
import { UserInfo } from "firebase/auth";
import { PropsWithChildren } from "react";
import * as sessionContextModule from "./sessionContext";
import { authMock, defaultUserInfoMock, userMock } from "tests/mocks/authMocks";

export const mockSignedInUser = (
  userInfoMock: UserInfo = defaultUserInfoMock
) => {
  mock.module("./sessionContext", () => {
    return {
      ...sessionContextModule,
      useClientSession: jest.fn().mockReturnValue({
        user: userMock(userInfoMock),
        auth: authMock(userInfoMock),
        isLoading: false,
      }),
      SessionContextProvider: jest.fn(({ children }: PropsWithChildren) => (
        <sessionContextModule.sessionContext.Provider
          value={{
            user: userMock(userInfoMock),
            auth: authMock(userInfoMock),
            isLoading: false,
          }}
        >
          {children}
        </sessionContextModule.sessionContext.Provider>
      )),
    };
  });
};

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
