import type {
    InsuranceContactProvider,
    InsuranceContactProviderRequest,
    InsuranceContactProviderResult
} from "./contact-attempt";


export interface TelnyxContactProviderConfiguration {
    readonly apiKey:
        string;

    readonly connectionId:
        string;

    readonly fromNumber:
        string;

    readonly apiBaseUrl?:
        string;
}


export type TelnyxFetch =
    (
        input:
            string,
        init:
            RequestInit
    ) =>
        Promise<Response>;


interface TelnyxDialResponse {
    readonly data?: {
        readonly call_control_id?:
            unknown;
    };
}


function requiredText(
    value:
        unknown,
    field:
        string
):
    string {

    if(
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ){
        throw new TypeError(
            `Telnyx contact provider requires ${field}.`
        );
    }

    return value.trim();
}


function normalizeBaseUrl(
    value:
        string | undefined
):
    string {

    const baseUrl =
        value ===
            undefined
            ? "https://api.telnyx.com/v2"
            : requiredText(
                value,
                "apiBaseUrl"
            );

    return baseUrl.replace(
        /\/+$/,
        ""
    );
}


function providerErrorMessage(
    status:
        number
):
    string {

    return `Telnyx call request failed with HTTP ${status}.`;
}


async function readTelnyxDialResponse(
    response:
        Response
):
    Promise<TelnyxDialResponse | undefined> {

    try {
        const value:
            unknown =
                await response.json();

        if(
            value === null ||
            typeof value !==
                "object"
        ){
            return undefined;
        }

        return value as
            TelnyxDialResponse;
    }
    catch {
        return undefined;
    }
}


export function createTelnyxContactProvider(
    configuration:
        TelnyxContactProviderConfiguration,
    fetchImpl:
        TelnyxFetch
):
    InsuranceContactProvider {

    const apiKey =
        requiredText(
            configuration.apiKey,
            "apiKey"
        );

    const connectionId =
        requiredText(
            configuration.connectionId,
            "connectionId"
        );

    const fromNumber =
        requiredText(
            configuration.fromNumber,
            "fromNumber"
        );

    const apiBaseUrl =
        normalizeBaseUrl(
            configuration.apiBaseUrl
        );

    if(
        typeof fetchImpl !==
            "function"
    ){
        throw new TypeError(
            "Telnyx contact provider requires fetch transport."
        );
    }

    return {
        async requestContact(
            request:
                InsuranceContactProviderRequest
        ):
            Promise<InsuranceContactProviderResult> {

            if(
                request.channel !==
                    "phone"
            ){
                return {
                    accepted:
                        false,
                    code:
                        "telnyx-channel-unsupported",
                    message:
                        "Telnyx Voice provider currently supports phone contact only.",
                    retryable:
                        false
                };
            }

            if(
                request.destination.channel !==
                    "phone"
            ){
                return {
                    accepted:
                        false,
                    code:
                        "telnyx-destination-channel-mismatch",
                    message:
                        "Telnyx Voice destination must be a phone destination.",
                    retryable:
                        false
                };
            }

            const destination =
                requiredText(
                    request.destination.value,
                    "phone destination"
                );

            let response:
                Response;

            try {
                response =
                    await fetchImpl(
                        `${apiBaseUrl}/calls`,
                        {
                            method:
                                "POST",
                            headers: {
                                authorization:
                                    `Bearer ${apiKey}`,
                                "content-type":
                                    "application/json",
                                accept:
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    connection_id:
                                        connectionId,
                                    to:
                                        destination,
                                    from:
                                        fromNumber
                                })
                        }
                    );
            }
            catch {
                return {
                    accepted:
                        false,
                    code:
                        "telnyx-transport-error",
                    message:
                        "Telnyx call request could not be delivered.",
                    retryable:
                        true
                };
            }

            if(
                !response.ok
            ){
                return {
                    accepted:
                        false,
                    code:
                        `telnyx-http-${response.status}`,
                    message:
                        providerErrorMessage(
                            response.status
                        ),
                    retryable:
                        response.status >=
                            500 ||
                        response.status ===
                            408 ||
                        response.status ===
                            429
                };
            }

            const payload =
                await readTelnyxDialResponse(
                    response
                );

            const callControlId =
                payload?.data
                    ?.call_control_id;

            if(
                typeof callControlId !==
                    "string" ||
                callControlId.trim()
                    .length ===
                    0
            ){
                return {
                    accepted:
                        false,
                    code:
                        "telnyx-invalid-response",
                    message:
                        "Telnyx accepted the request but did not return a call control identity.",
                    retryable:
                        true
                };
            }

            return {
                accepted:
                    true,
                providerReference:
                    callControlId.trim(),
                providerState:
                    "dial-request-accepted"
            };
        }
    };
}
