import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    photoURL?: string | null;
  }

  interface Session {
    user: User;
  }
}
