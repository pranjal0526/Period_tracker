import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      nickname?: string | null;
      email?: string | null;
      image?: string | null;
      googleId?: string;
      isPartner?: boolean;
      themePreference?: "light" | "dark";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    nickname?: string | null;
    googleId?: string;
    isPartner?: boolean;
    themePreference?: "light" | "dark";
  }
}
