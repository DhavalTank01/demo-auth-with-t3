"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";

export function SignupForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    // We use the TRPC react client here for the mutation
    const signupMutation = api.auth.signUp.useMutation();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const name = formData.get("name") as string;

        try {
            // 1. Create user & Send Email (Handled on server)
            await signupMutation.mutateAsync({ email, name });

            showToast("Account created! Check your email.", "success");
            // 2. Manual Redirect with Email param
            router.push(`/check-email?email=${encodeURIComponent(email)}`);
        } catch (e: unknown) {
            let msg = "An unexpected error occurred.";
            if (e instanceof Error) {
                msg = e.message;
                try {
                    const parsed: unknown = JSON.parse(msg);
                    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null && 'message' in parsed[0]) {
                        const firstError = parsed[0] as { message: unknown };
                        if (typeof firstError.message === 'string') {
                            msg = firstError.message;
                        }
                    }
                } catch {
                    // Not JSON
                }
            }
            showToast(msg, "error");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md rounded-xl bg-white/10 p-8 shadow-lg backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label htmlFor="name" className="text-sm font-medium text-white">
                        Full Name
                    </label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        placeholder="John Doe"
                        required
                        className="rounded-lg bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none ring-2 ring-transparent transition focus:ring-[hsl(280,100%,70%)]"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium text-white">
                        Email Address
                    </label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        placeholder="you@example.com"
                        required
                        className="rounded-lg bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none ring-2 ring-transparent transition focus:ring-[hsl(280,100%,70%)]"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || signupMutation.isPending}
                    className="mt-2 rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20 hover:text-[hsl(280,100%,70%)] disabled:opacity-50"
                >
                    {isLoading ? "Signing up..." : "Sign up with Email"}
                </button>
            </form>

            <div className="mt-6 flex flex-col gap-2 text-center text-sm text-white/60">
                <p>
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-medium text-[hsl(280,100%,70%)] hover:underline"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
