"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

function SessionWatchdog() {
    const { data: session, status } = useSession();
    const router = useRouter();
    // Store the user ID to detect actual user changes (login/logout/switch user)
    const previousUserId = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        // Do nothing while loading
        if (status === "loading") return;

        // If it's the first run (after loading), just set the ref and do nothing
        if (previousUserId.current === undefined) {
            previousUserId.current = session?.user?.id ?? null;
            return;
        }

        const currentUserId = session?.user?.id ?? null;

        // If the user ID changed (logged in, logged out, or switched user)
        // we refresh the server components to match the new session state.
        if (previousUserId.current !== currentUserId) {
            previousUserId.current = currentUserId;
            router.refresh();
        }
    }, [session, status, router]);

    return null;
}

export function ClientSessionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <SessionWatchdog />
            {children}
        </SessionProvider>
    );
}
