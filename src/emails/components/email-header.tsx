
import {
    Img,
    Section,
} from "@react-email/components";
import * as React from "react";

interface EmailHeaderProps {
    logoUrl?: string;
    appName?: string;
}

export const EmailHeader = ({
    logoUrl = "https://react-email-demo-7svne7k4k-resend.vercel.app/static/vercel-logo.png",
    appName = "T3 Auth App",
}: EmailHeaderProps) => {
    return (
        <Section className="mt-[32px]">
            <Img
                src={logoUrl}
                width="40"
                height="40"
                alt={appName}
                className="my-0 mx-auto"
            />
        </Section>
    );
};

export default EmailHeader;
