import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { slugify } from "@/lib/utils/slug";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.log("❌ Email tidak ditemukan:", credentials.email);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          console.log("❌ Password salah untuk:", credentials.email);
          return null;
        }

        if (!user.isActive) {
          throw new Error("AccountDisabled");
        }

        return {
          id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.img ?? null,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.image = user.image;
        token.name = user.name;
        token.email = user.email;

        if (user.role === "AdminSMK") {
          const smk = await prisma.sMK.findUnique({
            where: { user_id: user.id },
            include: { user: true },
          });
          if (smk) {
            token.smkSlug = slugify(smk.user.name);
          }
        }

        if (user.role === "AdminJurusan") {
          const jurusan = await prisma.jurusan.findUnique({
            where: { user_id: user.id },
            include: { smk: { include: { user: true } } },
          });
          if (jurusan) {
            token.smkSlug = slugify(jurusan.smk.user.name);
            token.jurusanSlug = slugify(jurusan.nama_jurusan);
          }
        }
      }

      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
        if (session.image) token.image = session.image;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.image = token.image as string;
      session.user.name = token.name as string;
      session.user.email = token.email as string;
      session.user.smkSlug = token.smkSlug as string | undefined;
      return session;
    },
  },

  pages: { signIn: "/auth/login" },
  secret: process.env.NEXTAUTH_SECRET,
};