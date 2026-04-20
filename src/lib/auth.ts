import crypto from "crypto";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { readServerEnv } from "@/lib/env";
import connectDB from "@/lib/mongodb/mongoose";
import { encryptMasterKey } from "@/lib/encryption/crypto";
import User from "@/models/User";

const googleClientId = readServerEnv("GOOGLE_CLIENT_ID", {
  developmentFallback: "missing-google-client-id",
});
const googleClientSecret = readServerEnv("GOOGLE_CLIENT_SECRET", {
  developmentFallback: "missing-google-client-secret",
});
const nextAuthSecret = readServerEnv("NEXTAUTH_SECRET", {
  developmentFallback: "development-secret-change-me",
});

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      await connectDB();

      let dbUser = await User.findOne({ email: user.email });

      if (!dbUser) {
        dbUser = await User.create({
          email: user.email,
          name: user.name,
          nickname: user.name?.split(" ")[0],
          image: user.image,
          googleId: account?.providerAccountId,
        });
      }

      dbUser.name = user.name ?? dbUser.name;
      dbUser.image = user.image ?? dbUser.image;
      dbUser.nickname = dbUser.nickname ?? user.name?.split(" ")[0];

      if (account?.providerAccountId) {
        dbUser.googleId = account.providerAccountId;
      }

      if (!dbUser.encryptionKey) {
        const masterKey = crypto.randomBytes(32).toString("hex");
        dbUser.encryptionKey = encryptMasterKey(masterKey, dbUser.id);
      }

      await dbUser.save();
      return true;
    },
    async jwt({ token, account }) {
      if (token.email) {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email }).select(
          "_id name nickname isPartner themePreference",
        );

        if (dbUser) {
          token.userId = dbUser.id;
          token.isPartner = dbUser.isPartner;
          token.themePreference = dbUser.themePreference;
          token.nickname = dbUser.nickname ?? dbUser.name ?? null;
          token.name = dbUser.name ?? (typeof token.name === "string" ? token.name : null);
        } else {
          token.userId = "";
          token.sub = "";
          token.isPartner = false;
          token.themePreference = "light";
          token.nickname = null;
          token.name = null;
        }
      }

      if (account?.providerAccountId) {
        token.googleId = account.providerAccountId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? token.sub ?? "");
        session.user.googleId =
          typeof token.googleId === "string" ? token.googleId : undefined;
        session.user.isPartner = Boolean(token.isPartner);
        session.user.nickname =
          typeof token.nickname === "string" ? token.nickname : null;
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name;
        session.user.themePreference =
          token.themePreference === "dark" ? "dark" : "light";
      }

      return session;
    },
  },
  secret: nextAuthSecret,
};
