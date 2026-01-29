import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import Resend from "next-auth/providers/resend";
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
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
  },
} satisfies NextAuthConfig;
