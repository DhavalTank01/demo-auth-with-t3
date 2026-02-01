import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { users } from "@/server/db/schema";
import { env } from "@/env";

export const authRouter = createTRPCRouter({
    signUp: publicProcedure
        .input(z.object({
            email: z.string().email("Invalid email address"),
            name: z.string().min(1, "Name is required"),
            password: z.string().min(6, "Password must be at least 6 characters"),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if user exists
            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email),
            });

            if (existingUser) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "User already exists",
                });
            }

            const { hash } = await import("bcryptjs");
            const hashedPassword = await hash(input.password, 10);

            // Create new user with name
            await ctx.db.insert(users).values({
                email: input.email,
                name: input.name,
                password: hashedPassword,
                isVerified: false
            });

            // send  magic link
            try {
                const provider = env.EMAIL_PROVIDER === "nodemailer" ? "nodemailer" : "resend";
                await ctx.signIn(provider, {
                    email: input.email,
                    redirect: false,
                });
            } catch (error) {
                if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
                    return { success: true };
                }
                console.error("[Auth] Signin error:", error);
                throw error;
            }

            return { success: true };
        }),

    sendOtp: publicProcedure
        .input(z.object({ email: z.string().email() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email),
            });

            if (!user) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            if (!user.isVerified) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "EmailNotVerified",
                });
            }

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            // Expires in 10 minutes
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

            await ctx.db.update(users).set({
                otp,
                otpExpires
            }).where(eq(users.email, input.email));

            // Send Email
            const provider = env.EMAIL_PROVIDER;
            if (provider === "nodemailer") {
                const { createTransport } = await import("nodemailer");
                const transport = createTransport({
                    host: env.EMAIL_SERVER_HOST,
                    port: Number(env.EMAIL_SERVER_PORT),
                    auth: {
                        user: env.EMAIL_SERVER_USER,
                        pass: env.EMAIL_SERVER_PASSWORD,
                    },
                });

                await transport.sendMail({
                    to: input.email,
                    from: env.EMAIL_FROM,
                    subject: "Your Login OTP",
                    text: `Your OTP is: ${otp}`,
                    html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
                });
            } else {
                const { Resend } = await import("resend");
                const resend = new Resend(env.AUTH_RESEND_KEY);
                await resend.emails.send({
                    from: env.EMAIL_FROM ?? "onboarding@resend.dev",
                    to: input.email,
                    subject: "Your Login OTP",
                    html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
                });
            }

            return { success: true };
        }),

    login: publicProcedure
        .input(z.object({ email: z.string().email("Invalid email address") }))
        .mutation(async ({ ctx, input }) => {
            // Check if user exists
            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email),
            });

            if (!existingUser) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Account not found. Please sign up.",
                });
            }

            try {
                const provider = env.EMAIL_PROVIDER === "nodemailer" ? "nodemailer" : "resend";
                await ctx.signIn(provider, {
                    email: input.email,
                    redirect: false,
                });
            } catch (error) {
                if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
                    return { success: true };
                }
                console.error("[Auth] Signin error:", error);
                throw error;
            }

            return { success: true };
        }),

    checkVerified: publicProcedure
        .input(z.object({ email: z.string().email() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email),
            });

            return {
                exists: !!user,
                isVerified: !!user?.isVerified,
            };
        }),
});
