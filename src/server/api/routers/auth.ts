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
            name: z.string().min(1, "Name is required")
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

            // Create new user with name
            await ctx.db.insert(users).values({
                email: input.email,
                name: input.name
            });

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
});
