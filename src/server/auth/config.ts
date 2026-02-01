import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { env } from "@/env";

import { db } from "@/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    env.EMAIL_PROVIDER === "nodemailer"
      ? Nodemailer({
        server: {
          host: env.EMAIL_SERVER_HOST,
          port: Number(env.EMAIL_SERVER_PORT),
          auth: {
            user: env.EMAIL_SERVER_USER,
            pass: env.EMAIL_SERVER_PASSWORD,
          },
        },
        from: env.EMAIL_FROM,
        sendVerificationRequest: async ({ identifier, url, provider }) => {
          const { createTransport } = await import("nodemailer");
          const { render } = await import("@react-email/render");
          const { MagicLinkEmail } = await import("@/emails/magic-link");

          const transport = createTransport(provider.server);
          const emailHtml = await render(MagicLinkEmail({ magicLink: url }));

          console.log(`[Nodemailer] Sending magic link to ${identifier}`);

          await transport.sendMail({
            to: identifier,
            from: provider.from ?? env.EMAIL_FROM ?? "noreply@example.com",
            subject: "Sign in to T3 Auth App",
            html: emailHtml,
          });

          console.log(`[Nodemailer] Magic link sent to ${identifier}`);
        },
      })
      : Resend({
        apiKey: env.AUTH_RESEND_KEY,
        from: env.EMAIL_FROM ?? "onboarding@resend.dev",
        sendVerificationRequest: async ({ identifier, url, provider }) => {
          const { render } = await import("@react-email/render");
          const { MagicLinkEmail } = await import("@/emails/magic-link");
          const { Resend } = await import("resend");

          const resend = new Resend(provider.apiKey);
          const emailHtml = await render(MagicLinkEmail({ magicLink: url }));

          console.log(`[Resend] Sending magic link to ${identifier}`);

          try {
            await resend.emails.send({
              from: provider.from ?? env.EMAIL_FROM ?? "onboarding@resend.dev",
              to: identifier,
              subject: "Your Magic Link",
              html: emailHtml,
            });
            console.log(`[Resend] Magic link sent to ${identifier}`);
          } catch (error) {
            console.error("[Resend] Error sending email:", error);
            throw new Error("Failed to send verification email");
          }
        },
      }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email) return null;

        const email = credentials.email as string;
        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, email),
        });

        if (!user) return null;

        // 1. Password Login
        if (credentials.password) {
          if (!user.password) return null; // User has no password set
          const { compare } = await import("bcryptjs");
          const isValid = await compare(credentials.password as string, user.password);

          if (!isValid) return null;

          if (!user.isVerified) {
            throw new Error("EmailNotVerified");
          }

          return { id: user.id, email: user.email, name: user.name };
        }

        // 2. OTP Login
        if (credentials.otp) {
          if (!user.otp || !user.otpExpires) return null;

          // Check if email is verified
          if (!user.isVerified) {
            throw new Error("EmailNotVerified");
          }

          // Check expiry
          if (new Date() > user.otpExpires) {
            throw new Error("OTPExpired");
          }

          // Check secret (assuming plain text for now as per schema implementation, ideally hashed)
          // For simple demo, we'll verify it directly.
          if (credentials.otp !== user.otp) {
            return null;
          }

          // Clear OTP after successful use
          await db.update(users).set({ otp: null, otpExpires: null, isVerified: true }).where(eq(users.id, user.id));

          return { id: user.id, email: user.email, name: user.name };
        }

        return null;
      },
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub ?? (token.id as string),
      },
    }),
  },
  events: {
    signIn: async ({ user, account }) => {
      if (account?.provider === "nodemailer" || account?.provider === "resend") {
        if (user.email) {
          await db.update(users).set({ isVerified: true }).where(eq(users.email, user.email));
        }
      }
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
  },
} satisfies NextAuthConfig;
