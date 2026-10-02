export interface InsuranceOutboundContactRuntimeEnvironment {
    readonly INSURANCE_OUTBOUND_CONTACT_ENABLED?: unknown;
    readonly INSURANCE_CONTACT_PROVIDER?: unknown;
    readonly TELNYX_API_KEY?: unknown;
    readonly TELNYX_CONNECTION_ID?: unknown;
    readonly TELNYX_FROM_NUMBER?: unknown;
}

export interface InsuranceTelnyxOutboundRuntimeConfiguration {
    readonly provider: "telnyx";
    readonly apiKey: string;
    readonly connectionId: string;
    readonly fromNumber: string;
}

export type InsuranceOutboundContactRuntimeConfiguration =
    InsuranceTelnyxOutboundRuntimeConfiguration;

function optionalRuntimeText(
    value: unknown
): string | undefined {
    if(
        typeof value !==
            "string"
    ){
        return undefined;
    }

    const text =
        value.trim();

    return text.length > 0
        ? text
        : undefined;
}

export function resolveInsuranceOutboundContactRuntimeConfiguration(
    environment: InsuranceOutboundContactRuntimeEnvironment
): InsuranceOutboundContactRuntimeConfiguration | undefined {
    if(
        environment.INSURANCE_OUTBOUND_CONTACT_ENABLED !==
            "true"
    ){
        return undefined;
    }

    const provider =
        optionalRuntimeText(
            environment.INSURANCE_CONTACT_PROVIDER
        )?.toLowerCase();

    if(
        provider !==
            "telnyx"
    ){
        return undefined;
    }

    const apiKey =
        optionalRuntimeText(
            environment.TELNYX_API_KEY
        );

    const connectionId =
        optionalRuntimeText(
            environment.TELNYX_CONNECTION_ID
        );

    const fromNumber =
        optionalRuntimeText(
            environment.TELNYX_FROM_NUMBER
        );

    if(
        apiKey === undefined ||
        connectionId === undefined ||
        fromNumber === undefined
    ){
        return undefined;
    }

    return {
        provider:
            "telnyx",
        apiKey,
        connectionId,
        fromNumber
    };
}
