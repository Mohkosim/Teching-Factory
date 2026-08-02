import "next-auth";
import "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    image?: string | null;
    smkSlug?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      smkSlug?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    smkSlug?: string;
  }
}