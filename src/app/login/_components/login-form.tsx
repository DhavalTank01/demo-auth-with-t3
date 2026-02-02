"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginMode = "magic-link" | "otp" | "password";

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const [mode, setMode] = useState<LoginMode>("magic-link");

    // Form states
    const [otpSent, setOtpSent] = useState(false);
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (searchParams.get("error") === "SessionExpired") {
            showToast("Your session has expired. Please log in again.", "error");
            router.replace("/login");
        }
    }, [searchParams, showToast, router]);

    const loginMutation = api.auth.login.useMutation();
    const sendOtpMutation = api.auth.sendOtp.useMutation();
    const checkVerifiedMutation = api.auth.checkVerified.useMutation();

    const handleMagicLinkLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const emailVal = formData.get("email") as string;

        try {
            await loginMutation.mutateAsync({ email: emailVal });
            showToast("Magic link sent! Check your email.", "success");
            router.push(`/check-email?email=${encodeURIComponent(emailVal)}`);
        } catch (e: unknown) {
            handleError(e);
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const emailVal = formData.get("email") as string;
        const passwordVal = formData.get("password") as string;

        try {
            // Pre-check verification status
            const status = await checkVerifiedMutation.mutateAsync({ email: emailVal });

            if (status.exists && !status.isVerified) {
                showToast("Account not verified. Sending magic link...", "error");
                await handleMagicLinkFallback(emailVal);
                return;
            }

            const result = await signIn("credentials", {
                email: emailVal,
                password: passwordVal,
                redirect: false,
            });

            if (result?.error) {
                if (result.error === "EmailNotVerified") {
                    showToast("Account not verified. Sending magic link...", "error");
                    await handleMagicLinkFallback(emailVal);
                    return;
                }
                throw new Error("Invalid credentials");
            }

            if (result?.ok) {
                showToast("Logged in successfully", "success");
                router.push("/");
                router.refresh();
            }
        } catch (e: unknown) {
            handleError(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            showToast("Please enter email first", "error");
            return;
        }
        try {
            await sendOtpMutation.mutateAsync({ email });
            setOtpSent(true);
            showToast("OTP sent to your email", "success");
        } catch (e: unknown) {
            if (e instanceof Error && e.message.includes("EmailNotVerified")) {
                showToast("Account not verified. Sending magic link...", "error");
                await handleMagicLinkFallback(email);
                return;
            }
            // Helper or manual check for TRPC error structure
            const msg = getErrorMessage(e);
            if (msg === "EmailNotVerified") {
                showToast("Account not verified. Sending magic link...", "error");
                await handleMagicLinkFallback(email);
                return;
            }
            handleError(e);
        }
    };

    const handleOtpLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const otpVal = formData.get("otp") as string;
        // Email input is disabled when OTP is sent, so formData won't have it. Use state.
        const emailVal = email;

        try {

            // Pre-check verification status
            const status = await checkVerifiedMutation.mutateAsync({ email: emailVal });

            if (status.exists && !status.isVerified) {
                showToast("Account not verified. Sending magic link...", "error");
                await handleMagicLinkFallback(emailVal);
                return;
            }

            const result = await signIn("credentials", {
                email: emailVal,
                otp: otpVal,
                redirect: false,
            });

            if (result?.error) {
                if (result.error === "OTPExpired") {
                    throw new Error("OTP has expired");
                }
                if (result.error === "EmailNotVerified") {
                    showToast("Account not verified. Sending magic link...", "error");
                    await handleMagicLinkFallback(emailVal);
                    return;
                }
                throw new Error("Invalid OTP");
            }

            if (result?.ok) {
                showToast("Logged in successfully", "success");
                router.push("/");
                router.refresh();
            }
        } catch (e: unknown) {
            handleError(e);
        } finally {
            setIsLoading(false);
        }
    };

    async function handleMagicLinkFallback(emailVals: string) {
        try {
            await loginMutation.mutateAsync({ email: emailVals });
            router.push(`/check-email?email=${encodeURIComponent(emailVals)}`);
        } catch (e) {
            handleError(e);
        }
    }

    function getErrorMessage(e: unknown) {
        if (e instanceof Error) {
            try {
                const parsed = JSON.parse(e.message);
                if (Array.isArray(parsed) && parsed[0]?.message) {
                    return parsed[0].message;
                }
            } catch { return e.message; }
        }
        return "Unknown error";
    }

    function handleError(e: unknown) {
        const msg = getErrorMessage(e);
        showToast(msg, "error");
    }

    return (
        <div className="w-full max-w-md rounded-xl bg-white/10 p-8 shadow-lg backdrop-blur-sm">
            {/* Tabs */}
            <div className="mb-6 flex rounded-lg bg-black/20 p-1">
                {(["magic-link", "otp", "password"] as const).map((m) => (
                    <Button
                        key={m}
                        onClick={() => { setMode(m); setOtpSent(false); }}
                        variant="ghost"
                        className={`flex-1 ${mode === m
                            ? "bg-white/20 text-white shadow-sm"
                            : "text-white/60 hover:text-black"
                            }`}
                    >
                        {m === "magic-link" ? "Magic Link" : m === "otp" ? "OTP" : "Password"}
                    </Button>
                ))}
            </div>

            {/* Forms */}
            {mode === "magic-link" && (
                <form onSubmit={handleMagicLinkLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-white">Email Address</label>
                        <Input
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            required
                            className="rounded-lg bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none ring-2 ring-transparent transition focus:ring-[hsl(280,100%,70%)]"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="mt-2 rounded-full bg-white/10 px-10 py-3 font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                        loading={loginMutation.isPending}
                    >
                        {loginMutation.isPending ? "Sending..." : "Send Magic Link"}
                    </Button>
                </form>
            )}

            {mode === "password" && (
                <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-white">Email Address</label>
                        <Input
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            required
                            className="rounded-lg bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none ring-2 ring-transparent transition focus:ring-[hsl(280,100%,70%)]"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-white">Password</label>
                        <Input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            className="rounded-lg bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none ring-2 ring-transparent transition focus:ring-[hsl(280,100%,70%)]"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 rounded-full bg-white/10 px-10 py-3 font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                        loading={isLoading}
                    >
                        {isLoading ? "Signing in..." : "Sign in"}
                    </Button>
                </form>
            )}

            {mode === "otp" && (
                <form onSubmit={handleOtpLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-white">Email Address</label>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                disabled={otpSent}
                                className="w-full rounded-lg bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none ring-2 ring-transparent transition focus:ring-[hsl(280,100%,70%)] disabled:opacity-50"
                            />
                            {!otpSent && (
                                <Button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={sendOtpMutation.isPending}
                                    className="whitespace-nowrap rounded-lg bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20 disabled:opacity-50"
                                    loading={sendOtpMutation.isPending}
                                >
                                    {sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {otpSent && (
                        <>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Enter OTP</label>
                                <Input
                                    type="text"
                                    name="otp"
                                    placeholder="123456"
                                    required
                                    className="rounded-lg bg-black/20 px-4 py-3 text-white placeholder-white/40 outline-none ring-2 ring-transparent transition focus:ring-[hsl(280,100%,70%)]"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="mt-2 rounded-full bg-white/10 px-10 py-3 font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                                loading={isLoading}
                            >
                                {isLoading ? "Verifying..." : "Validate OTP & Login"}
                            </Button>
                            <button
                                type="button"
                                onClick={() => setOtpSent(false)}
                                className="text-sm text-white/60 hover:text-white"
                            >
                                Change Email
                            </button>
                        </>
                    )}
                </form>
            )}

            <div className="mt-6 flex flex-col gap-2 text-center text-sm text-white/60">
                <p>
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/signup"
                        className="font-medium text-[hsl(280,100%,70%)] hover:underline"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
