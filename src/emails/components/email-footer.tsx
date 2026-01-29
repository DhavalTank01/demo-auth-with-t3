
import {
    Hr,
    Section,
    Text,
} from "@react-email/components";
import * as React from "react";

interface EmailFooterProps {
    appName?: string;
    address?: string;
}

export const EmailFooter = ({
    appName = "T3 Auth App",
    address = "123 Auth Street, Security City, SC 12345",
}: EmailFooterProps) => {
    return (
        <Section className="mt-[32px]">
            <Hr className="border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
                {appName}
            </Text>
            <Text className="text-[#666666] text-[12px] leading-[24px]">
                {address}
            </Text>
        </Section>
    );
};

export default EmailFooter;
