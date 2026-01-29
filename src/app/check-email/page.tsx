
import Link from "next/link";

export default async function CheckEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ email?: string }>;
}) {
    const { email } = await searchParams;

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                <div className="flex flex-col items-center gap-4 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-[3rem]">
                        Check Your <span className="text-[hsl(280,100%,70%)]">Email</span>
                    </h1>
                    <p className="max-w-md text-lg text-white/80">
                        A sign in link has been sent to{" "}
                        {email ? (
                            <span className="font-semibold text-white">{email}</span>
                        ) : (
                            "your email address"
                        )}
                        . Please check your inbox and click the link to continue.
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <Link
                        href="/login"
                        className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        </main>
    );
}
