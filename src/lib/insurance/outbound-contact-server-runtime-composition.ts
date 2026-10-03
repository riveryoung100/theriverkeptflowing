import {
    resolveInsuranceOutboundContactRuntimeConfiguration
} from "./outbound-contact-runtime-configuration";

import type {
    InsuranceOutboundContactRuntimeEnvironment
} from "./outbound-contact-runtime-configuration";

import {
    createInsuranceOutboundContactProviderComposition
} from "./outbound-contact-provider-composition";

import type {
    InsurancePrivateContactProviderComposition
} from "./private-contact-orchestration";

import type {
    TelnyxFetch
} from "./telnyx-contact-provider";


export function resolveInsuranceOutboundContactServerRuntimeComposition(
    environment:
        InsuranceOutboundContactRuntimeEnvironment,
    fetchImpl:
        TelnyxFetch
): InsurancePrivateContactProviderComposition | undefined {
    const configuration =
        resolveInsuranceOutboundContactRuntimeConfiguration(
            environment
        );

    if(
        configuration ===
            undefined
    ){
        return undefined;
    }

    return createInsuranceOutboundContactProviderComposition(
        configuration,
        fetchImpl
    );
}