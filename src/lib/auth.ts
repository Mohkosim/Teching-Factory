import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { slugify } from "@/lib/utils/slug";
import { verifyOtpLoginTicket } from "@/lib/utils/otp-login-ticket";

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

        const email = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log("❌ Email tidak ditemukan:", email);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          console.log("❌ Password salah untuk:", email);
          return null;
        }

        if (!user.isActive) {
          throw new Error("AccountDisabled");
        }

        if (user.role === "User" && !user.isVerified) {
          throw new Error("EmailNotVerified");
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

    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),

    CredentialsProvider({
      id: "otp-ticket",
      name: "OTP Ticket",
      credentials: {
        ticket: { label: "Ticket", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.ticket) return null;

        const userId = await verifyOtpLoginTicket(credentials.ticket);
        if (!userId) return null;

        const user = await prisma.user.findUnique({
          where: { user_id: userId },
        });

        if (!user || !user.isVerified) return null;

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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if ((profile as { email_verified?: boolean } | undefined)?.email_verified === false) {
          return false;
        }

        const email = user.email!.trim().toLowerCase();

        const existing = await prisma.user.findUnique({
          where: { email },
        });

        if (existing) {
          if (!existing.isActive) return false;

          if (!existing.isVerified) {
            const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10);
            const newName = user.name ?? existing.name;

            await prisma.user.update({
              where: { user_id: existing.user_id },
              data: {
                name: newName,
                password: randomPassword,
                isVerified: true,
                otpCode: null,
                otpExpiresAt: null,
                otpLastSentAt: null,
                otpAttempts: 0,
                regKeyHash: null,
              },
            });

            user.id = existing.user_id;
            user.role = existing.role;
            user.name = newName;
            user.image = existing.img ?? user.image ?? null;
          } else {
            user.id = existing.user_id;
            user.role = existing.role;
            user.name = existing.name;
            user.image = existing.img ?? user.image ?? null;
          }
        } else {
          const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10);

          const created = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              img: user.image ?? null,
              role: "User",
              isActive: true,
              isVerified: true,
              password: randomPassword,
            },
          });

          user.id = created.user_id;
          user.role = created.role;
          user.name = created.name;
          user.image = created.img;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.image = user.image;
        token.name = user.name;
        token.email = user.email;

        if (user.role === "AdminSMK") {
          token.smkSlug = slugify(user.name ?? user.email ?? user.id);
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

      if (trigger === "update") {
        if (session?.name) token.name = session.name;
        if (session?.email) token.email = session.email;
        if (session?.image) token.image = session.image;

        const role = token.role as string | undefined;
        const userId = token.id as string | undefined;

        if (userId && role === "AdminSMK") {
          const name = (token.name as string | null | undefined) ?? (token.email as string | null | undefined) ?? userId;
          token.smkSlug = slugify(name);
        }

        if (userId && role === "AdminJurusan") {
          const jurusan = await prisma.jurusan.findUnique({
            where: { user_id: userId },
            include: { smk: { include: { user: true } } },
          });
          if (jurusan) {
            token.smkSlug = slugify(jurusan.smk.user.name);
            token.jurusanSlug = slugify(jurusan.nama_jurusan);
          }
        }
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
      session.user.jurusanSlug = token.jurusanSlug as string | undefined;
      return session;
    },
  },

  pages: { signIn: "/auth/login" },
  secret: process.env.NEXTAUTH_SECRET,
};