import type {
    InsuranceOutboundContactRuntimeConfiguration
} from "./outbound-contact-runtime-configuration";

import {
    createTelnyxContactProvider
} from "./telnyx-contact-provider";

import type {
    TelnyxFetch
} from "./telnyx-contact-provider";

import type {
    InsurancePrivateContactProviderComposition
} from "./private-contact-orchestration";


export function createInsuranceOutboundContactProviderComposition(
    configuration:
        InsuranceOutboundContactRuntimeConfiguration,
    fetchImpl:
        TelnyxFetch
): InsurancePrivateContactProviderComposition {
    if(
        configuration.provider ===
            "telnyx"
    ){
        return {
            provider:
                createTelnyxContactProvider(
                    {
                        apiKey:
                            configuration.apiKey,
                        connectionId:
                            configuration.connectionId,
                        fromNumber:
                            configuration.fromNumber
                    },
                    fetchImpl
                ),
            providerName:
                "telnyx"
        };
    }

    const exhaustive: never =
        configuration;

    return exhaustive;
}