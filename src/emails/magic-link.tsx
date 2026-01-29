
import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Tailwind,
    Text,
    Font,
} from "@react-email/components";
import * as React from "react";
import EmailHeader from "./components/email-header";
import EmailFooter from "./components/email-footer";

interface MagicLinkEmailProps {
    magicLink: string;
}

export const MagicLinkEmail = ({
    magicLink = "https://example.com/magic-link",
}: MagicLinkEmailProps) => {
    const previewText = "Log in with this magic link.";

    return (
        <Html>
            <Head>
                <Font
                    fontFamily="Geist"
                    fallbackFontFamily="Helvetica"
                    webFont={{
                        url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-400-normal.woff2",
                        format: "woff2",
                    }}
                    fontWeight={400}
                    fontStyle="normal"
                />
            </Head>
            <Preview>{previewText}</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                brand: "#hsl(280,100%,70%)",
                            },
                        },
                    },
                }}
            >
                <Body className="bg-white font-sans">
                    <Container className="mx-auto my-0 pt-5 px-[25px] pb-12">
                        <EmailHeader logoUrl="https://react-email-demo-7svne7k4k-resend.vercel.app/static/vercel-logo.png" appName="T3 App" />

                        <Heading className="text-[28px] font-bold mt-12 text-center">
                            🪄 Your magic link
                        </Heading>

                        <Section className="my-6 mx-0 text-center">
                            <Text className="text-base leading-6">
                                <Link className="text-[#FF6363] font-bold text-lg no-underline" href={magicLink}>
                                    👉 Click here to sign in 👈
                                </Link>
                            </Text>
                            If you didn&apos;t request this, please ignore this email.
                        </Section>

                        <Text className="text-base leading-6 text-center">
                            Best,
                            <br />- The Team
                        </Text>

                        <EmailFooter />
                    </Container>
                </Body>
            </Tailwind>
        </Html >
    );
};

export default MagicLinkEmail;
