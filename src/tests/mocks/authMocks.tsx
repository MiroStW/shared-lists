import { Auth, User, UserInfo } from "firebase/auth";
import * as auth from "firebase/auth";
import { PropsWithChildren } from "react";
import * as sessionContextModule from "../../app/sessionContext";
import { jest, spyOn } from "bun:test";

export const defaultUserInfoMock: UserInfo = {
  uid: "123",
  displayName: "test",
  email: "test@test.de",
  phoneNumber: "123",
  photoURL: "test",
  providerId: "test",
};

export const userMock = (userInfoMock: UserInfo): User => ({
  ...userInfoMock,
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: "123",
    lastSignInTime: "123",
  },
  providerData: [userInfoMock],
  refreshToken: "123",
  tenantId: "123",
  delete: jest.fn(),
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
  reload: jest.fn(),
  toJSON: jest.fn(),
});

export const authMock = (userInfoMock: UserInfo): Auth => ({
  ...auth.getAuth(),
  currentUser: userMock(userInfoMock),
});

export const mockSignedInUser = (
  userInfoMock: UserInfo = defaultUserInfoMock
) => {
  spyOn(sessionContextModule, "useClientSession").mockReturnValue({
    user: userMock(userInfoMock),
    auth: authMock(userInfoMock),
    isLoading: false,
  });

  spyOn(sessionContextModule, "SessionContextProvider").mockImplementation(
    ({ children }: PropsWithChildren) => (
      <sessionContextModule.sessionContext.Provider
        value={{
          user: userMock(userInfoMock),
          auth: authMock(userInfoMock),
          isLoading: false,
        }}
      >
        {children}
      </sessionContextModule.sessionContext.Provider>
    )
  );
};
