"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export function GlobalToastHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showToast } = useToast();
    const processedRef = useRef<string | null>(null);

    useEffect(() => {
        const message = searchParams.get("message");
        const error = searchParams.get("error");

        // Avoid double-firing in strict mode by tracking the last processed param
        const paramKey = `${message}-${error}`;
        if (processedRef.current === paramKey) return;

        if (message === "SignedOut") {
            showToast("Signed out successfully", "success");
            processedRef.current = paramKey;
            router.replace("/");
        } else if (error === "SessionExpired") {
            showToast("Your session has expired. Please log in again.", "error");
            processedRef.current = paramKey;
            router.replace("/login");
        }
    }, [searchParams, router, showToast]);

    return null;
}
