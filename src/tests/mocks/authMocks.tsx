import { Auth } from "firebase/auth";
import * as auth from "firebase/auth";
import { PropsWithChildren } from "react";
import * as sessionContextModule from "../../app/sessionContext";
import { jest, spyOn } from "bun:test";
import * as getServerSession from "auth/getServerSession";
import { UserRecord, UserInfo as UserInfoAdmin } from "firebase-admin/auth";

export const defaultUserInfoMock: UserInfoAdmin = {
  uid: "123",
  displayName: "my test",
  email: "test@test.de",
  phoneNumber: "123",
  photoURL:
    "https://lh3.googleusercontent.com/a-/AFdZucozGD4aUujbqo6VDEVsYGbYKRwFaeue8ycnx2ZRXg=s96-c",
  providerId: "test",
  toJSON: jest.fn(),
};

export const userMock = (userInfoMock: UserInfoAdmin) => ({
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

export const userServerMock = (userInfoMock: UserInfoAdmin): UserRecord => ({
  ...userInfoMock,
  emailVerified: true,
  metadata: {
    creationTime: "123",
    lastSignInTime: "123",
    toJSON: jest.fn(),
  },
  providerData: [userInfoMock],
  tenantId: "123",
  disabled: false,
  toJSON: jest.fn(),
});

export const authMock = (userInfoMock: UserInfoAdmin): Auth => ({
  ...auth.getAuth(),
  currentUser: userMock(userInfoMock),
});

const mockUseClientSession = (user?: ReturnType<typeof userMock>) =>
  spyOn(sessionContextModule, "useClientSession").mockReturnValue({
    user,
    auth: user ? authMock(user) : auth.getAuth(),
    isLoading: false,
  });

const mockUseServerSession = (user?: ReturnType<typeof userServerMock>) =>
  spyOn(getServerSession, "getServerSession").mockReturnValue(
    Promise.resolve({
      user,
      error: undefined,
    })
  );

const mockSessionContextProvider = (user?: ReturnType<typeof userMock>) =>
  spyOn(sessionContextModule, "SessionContextProvider").mockImplementation(
    ({ children }: PropsWithChildren) => (
      <sessionContextModule.sessionContext.Provider
        value={{
          user,
          auth: user ? authMock(user) : auth.getAuth(),
          isLoading: false,
        }}
      >
        {children}
      </sessionContextModule.sessionContext.Provider>
    )
  );

export const mockAuthWithUser = (
  userInfoMock: UserInfoAdmin = defaultUserInfoMock
) => {
  const user = userMock(userInfoMock);
  const userServer = userServerMock(userInfoMock);
  mockUseClientSession(user);
  mockUseServerSession(userServer);
  mockSessionContextProvider(user);
};

export const mockAuthWithoutUser = () => {
  mockUseClientSession();
  mockUseServerSession();
  mockSessionContextProvider();
};
