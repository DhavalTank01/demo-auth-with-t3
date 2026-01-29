
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { SignupForm } from "./_components/signup-form";

export default async function SignupPage() {
    const session = await auth();

    if (session) {
        redirect("/");
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-[3rem]">
                        Create <span className="text-[hsl(280,100%,70%)]">Account</span>
                    </h1>
                    <p className="text-lg text-white/80">
                        Join us to get started
                    </p>
                </div>
                <SignupForm />
            </div>
        </main>
    );
}
