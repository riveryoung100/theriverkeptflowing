import {
    buildInsuranceQuoteRequestRecords
} from "../quote-request";

import type {
    InsuranceQuoteRequestDependencies
} from "../quote-request";

import {
    InsuranceQuoteRequestIdempotencyConflictError
} from "../d1-quote-request";

import type {
    D1InsuranceQuoteRequestPersistence
} from "../d1-quote-request";

import {
    createInsuranceQuoteRequestFingerprint,
    createInsuranceQuoteRequestIdempotencyKey
} from "../quote-request-idempotency";


export const INSURANCE_QUOTE_REQUEST_MAX_BODY_BYTES =
    16_384;

export const INSURANCE_QUOTE_REQUEST_IDEMPOTENCY_HEADER =
    "idempotency-key";

export interface InsuranceQuoteRequestApiDependencies
extends InsuranceQuoteRequestDependencies {
    readonly persistence:
        D1InsuranceQuoteRequestPersistence;
}

function jsonResponse(
    status: number,
    body: Readonly<
        Record<string, unknown>
    >
): Response {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                "content-type":
                    "application/json; charset=utf-8",
                "cache-control":
                    "no-store"
            }
        }
    );
}

function contentTypeIsJson(
    request: Request
): boolean {
    const contentType =
        request.headers
            .get(
                "content-type"
            );

    if(contentType === null){
        return false;
    }

    const mediaType =
        contentType
            .split(";")[0]
            ?.trim()
            .toLowerCase();

    return mediaType ===
        "application/json";
}

function originIsAllowed(
    request: Request
): boolean {
    const origin =
        request.headers
            .get(
                "origin"
            );

    if(origin === null){
        return true;
    }

    try {
        return new URL(origin).origin ===
            new URL(request.url).origin;
    }
    catch {
        return false;
    }
}

function declaredBodyTooLarge(
    request: Request
): boolean {
    const raw =
        request.headers
            .get(
                "content-length"
            );

    if(raw === null){
        return false;
    }

    if(!/^\d+$/.test(raw.trim())){
        return false;
    }

    return Number(raw) >
        INSURANCE_QUOTE_REQUEST_MAX_BODY_BYTES;
}

function encodedBodySize(
    value: string
): number {
    return new TextEncoder()
        .encode(value)
        .byteLength;
}

export function createInsuranceQuoteRequestApi(
    dependencies:
        InsuranceQuoteRequestApiDependencies
){
    return async function handleInsuranceQuoteRequest(
        request: Request
    ): Promise<Response> {
        if(request.method.toUpperCase() !== "POST"){
            return jsonResponse(
                405,
                {
                    ok:
                        false,
                    error:
                        "method-not-allowed"
                }
            );
        }

        if(!originIsAllowed(request)){
            return jsonResponse(
                403,
                {
                    ok:
                        false,
                    error:
                        "forbidden-origin"
                }
            );
        }

        if(!contentTypeIsJson(request)){
            return jsonResponse(
                415,
                {
                    ok:
                        false,
                    error:
                        "unsupported-media-type"
                }
            );
        }

        let idempotencyKey:
            ReturnType<
                typeof createInsuranceQuoteRequestIdempotencyKey
            >;

        try {
            idempotencyKey =
                createInsuranceQuoteRequestIdempotencyKey(
                    request.headers
                        .get(
                            INSURANCE_QUOTE_REQUEST_IDEMPOTENCY_HEADER
                        )
                );
        }
        catch {
            return jsonResponse(
                400,
                {
                    ok:
                        false,
                    error:
                        "invalid-idempotency-key"
                }
            );
        }

        if(declaredBodyTooLarge(request)){
            return jsonResponse(
                413,
                {
                    ok:
                        false,
                    error:
                        "request-too-large"
                }
            );
        }

        let rawBody:
            string;

        try {
            rawBody =
                await request.text();
        }
        catch {
            return jsonResponse(
                400,
                {
                    ok:
                        false,
                    error:
                        "invalid-request"
                }
            );
        }

        if(
            encodedBodySize(rawBody) >
            INSURANCE_QUOTE_REQUEST_MAX_BODY_BYTES
        ){
            return jsonResponse(
                413,
                {
                    ok:
                        false,
                    error:
                        "request-too-large"
                }
            );
        }

        let parsed:
            unknown;

        try {
            parsed =
                JSON.parse(
                    rawBody
                );
        }
        catch {
            return jsonResponse(
                400,
                {
                    ok:
                        false,
                    error:
                        "invalid-request"
                }
            );
        }

        let records:
            ReturnType<
                typeof buildInsuranceQuoteRequestRecords
            >;

        try {
            records =
                buildInsuranceQuoteRequestRecords(
                    parsed,
                    {
                        now:
                            dependencies.now,
                        createUuid:
                            dependencies.createUuid
                    }
                );
        }
        catch {
            return jsonResponse(
                400,
                {
                    ok:
                        false,
                    error:
                        "invalid-request"
                }
            );
        }

        let requestFingerprint:
            Awaited<
                ReturnType<
                    typeof createInsuranceQuoteRequestFingerprint
                >
            >;

        try {
            requestFingerprint =
                await createInsuranceQuoteRequestFingerprint(
                    records
                );
        }
        catch {
            return jsonResponse(
                500,
                {
                    ok:
                        false,
                    error:
                        "quote-request-failed"
                }
            );
        }

        let persistenceResult:
            Awaited<
                ReturnType<
                    D1InsuranceQuoteRequestPersistence[
                        "createIdempotentQuoteRequest"
                    ]
                >
            >;

        try {
            persistenceResult =
                await dependencies
                    .persistence
                    .createIdempotentQuoteRequest({
                        idempotencyKey,
                        requestFingerprint,
                        records
                    });
        }
        catch(error){
            if(
                error instanceof
                    InsuranceQuoteRequestIdempotencyConflictError
            ){
                return jsonResponse(
                    409,
                    {
                        ok:
                            false,
                        error:
                            "idempotency-conflict"
                    }
                );
            }

            return jsonResponse(
                500,
                {
                    ok:
                        false,
                    error:
                        "quote-request-failed"
                }
            );
        }

        return jsonResponse(
            persistenceResult.outcome ===
                "replayed"
                ? 200
                : 201,
            {
                ok:
                    true,
                relationshipId:
                    persistenceResult
                        .relationshipId
            }
        );
    };
}
