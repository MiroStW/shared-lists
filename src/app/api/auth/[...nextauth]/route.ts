/* eslint-disable no-param-reassign */
import { firebaseAdmin } from "@firebase/firebaseAdmin";
import { FirestoreAdapter } from "@next-auth/firebase-adapter";
import { getAuth } from "firebase-admin/auth";
import { NextApiRequest, NextApiResponse } from "next";
import NextAuth, { NextAuthOptions, User } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  adapter: FirestoreAdapter(firebaseAdmin),
  callbacks: {
    async signIn({ account,  user }) {
      if (account?.provider === "google") {
        // const credential = GoogleAuthProvider.credential(account.id_token);

        const getFirebaseUser = async (nextAuthUser: User | AdapterUser) => {
          try {
            const fbUser = await getAuth(firebaseAdmin).getUser(
              nextAuthUser.id
            );
            return fbUser;
          } catch {
            const fbUser = await getAuth(firebaseAdmin).createUser({
              uid: nextAuthUser.id,
              email: nextAuthUser.email || undefined,
              displayName: nextAuthUser.name,
              photoURL: nextAuthUser.image,
            });
            return fbUser;
          }
        };

       await getFirebaseUser(user);
      }
      return true;
    },
    session: async ({ session, user }) => {
      if (session && session.user && user.id) {
        session.user.id = user.id;
        session.user.photoURL = user.image;
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_APP_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: "Username", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)
        if (!credentials?.username || !credentials?.password) return null;

        // const { user: FbUser } = await signInWithEmailAndPassword(
        //   auth,
        //   credentials?.username,
        //   credentials?.password
        // );

        const user = {
          id: "1",
          name: "miro test",
          email: "flair2k+thisisamock@gmail.com",
        };
        // const res = await fetch("/your/endpoint", {
        //   method: "POST",
        //   body: JSON.stringify(credentials),
        //   headers: { "Content-Type": "application/json" },
        // });
        // const user = await res.json();

        // If no error and we have user data, return it
        if (user) {
          console.log(user);
          return user;
        }
        // Return null if user data could not be retrieved
        return null;
      },
    }),
  ],
};

const handler = (request: NextApiRequest, response: NextApiResponse) =>
  NextAuth(request, response, authOptions);

export { handler as GET, handler as POST };
