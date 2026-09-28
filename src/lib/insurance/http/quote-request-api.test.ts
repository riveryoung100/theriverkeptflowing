import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceQuoteRequestApi,
    INSURANCE_QUOTE_REQUEST_MAX_BODY_BYTES
} from "./quote-request-api";

import type {
    InsuranceQuoteRequestRecords
} from "../quote-request";


class FakePersistence {
    public readonly received:
        InsuranceQuoteRequestRecords[] = [];

    public error:
        Error | undefined;

    async createQuoteRequest(
        records:
            InsuranceQuoteRequestRecords
    ){
        if(this.error !== undefined){
            throw this.error;
        }

        this.received.push(
            records
        );
    }
}

function dependencies(){
    let sequence =
        0;

    const persistence =
        new FakePersistence();

    return {
        persistence,

        now(){
            return "2026-09-28T17:00:00.000Z";
        },

        createUuid(){
            sequence += 1;

            return `http-${sequence}`;
        }
    };
}

function validBody(){
    return {
        firstName:
            "River",
        lastName:
            "Lead",
        email:
            "river@example.com",
        state:
            "TX",
        postalCode:
            "79720",
        productInterest:
            "auto",
        consent: {
            email:
                true,
            textVersion:
                "quote-v1"
        }
    };
}

function request(
    body:
        string,
    options?: {
        readonly method?:
            string;

        readonly contentType?:
            string | null;

        readonly origin?:
            string | null;

        readonly contentLength?:
            string | null;

        readonly url?:
            string;
    }
){
    const headers =
        new Headers();

    if(options?.contentType !== null){
        headers.set(
            "content-type",
            options?.contentType ??
                "application/json"
        );
    }

    if(options?.origin !== undefined &&
       options.origin !== null){
        headers.set(
            "origin",
            options.origin
        );
    }

    if(options?.contentLength !== undefined &&
       options.contentLength !== null){
        headers.set(
            "content-length",
            options.contentLength
        );
    }

    return new Request(
        options?.url ??
            "https://theriverkeptflowing.com/api/insurance/quote-request",
        {
            method:
                options?.method ??
                "POST",
            headers,
            body:
                (
                    options?.method ??
                    "POST"
                ).toUpperCase() === "GET"
                    ? undefined
                    : body
        }
    );
}

async function body(
    response: Response
){
    return await response.json() as
        Record<string, unknown>;
}

test(
    "quote request API returns 201 only after successful persistence",
    async () => {
        const deps =
            dependencies();

        const api =
            createInsuranceQuoteRequestApi(
                deps
            );

        const response =
            await api(
                request(
                    JSON.stringify(
                        validBody()
                    )
                )
            );

        assert.equal(
            response.status,
            201
        );

        assert.deepEqual(
            await body(response),
            {
                ok:
                    true,
                relationshipId:
                    "relationship:http-1"
            }
        );

        assert.equal(
            deps.persistence
                .received.length,
            1
        );
    }
);

test(
    "quote request API rejects unsupported HTTP methods",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    "",
                    {
                        method:
                            "GET"
                    }
                )
            );

        assert.equal(
            response.status,
            405
        );

        assert.deepEqual(
            await body(response),
            {
                ok:
                    false,
                error:
                    "method-not-allowed"
            }
        );

        assert.equal(
            deps.persistence
                .received.length,
            0
        );
    }
);

test(
    "quote request API rejects unsupported content type",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    JSON.stringify(
                        validBody()
                    ),
                    {
                        contentType:
                            "text/plain"
                    }
                )
            );

        assert.equal(
            response.status,
            415
        );

        assert.equal(
            (
                await body(response)
            ).error,
            "unsupported-media-type"
        );
    }
);

test(
    "quote request API accepts application/json with charset",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    JSON.stringify(
                        validBody()
                    ),
                    {
                        contentType:
                            "application/json; charset=utf-8"
                    }
                )
            );

        assert.equal(
            response.status,
            201
        );
    }
);

test(
    "quote request API rejects cross-origin browser submission",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    JSON.stringify(
                        validBody()
                    ),
                    {
                        origin:
                            "https://evil.example"
                    }
                )
            );

        assert.equal(
            response.status,
            403
        );

        assert.equal(
            (
                await body(response)
            ).error,
            "forbidden-origin"
        );

        assert.equal(
            deps.persistence
                .received.length,
            0
        );
    }
);

test(
    "quote request API accepts matching browser origin",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    JSON.stringify(
                        validBody()
                    ),
                    {
                        origin:
                            "https://theriverkeptflowing.com"
                    }
                )
            );

        assert.equal(
            response.status,
            201
        );
    }
);

test(
    "quote request API permits absent Origin for server-to-server request",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    JSON.stringify(
                        validBody()
                    ),
                    {
                        origin:
                            null
                    }
                )
            );

        assert.equal(
            response.status,
            201
        );
    }
);

test(
    "quote request API rejects declared oversized request before parsing",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    "{}",
                    {
                        contentLength:
                            String(
                                INSURANCE_QUOTE_REQUEST_MAX_BODY_BYTES +
                                1
                            )
                    }
                )
            );

        assert.equal(
            response.status,
            413
        );

        assert.equal(
            (
                await body(response)
            ).error,
            "request-too-large"
        );

        assert.equal(
            deps.persistence
                .received.length,
            0
        );
    }
);

test(
    "quote request API rejects actual encoded body above limit",
    async () => {
        const deps =
            dependencies();

        const huge =
            JSON.stringify({
                ...validBody(),
                campaign:
                    "x".repeat(
                        INSURANCE_QUOTE_REQUEST_MAX_BODY_BYTES
                    )
            });

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    huge
                )
            );

        assert.equal(
            response.status,
            413
        );
    }
);

test(
    "quote request API rejects malformed JSON",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    "{not-json"
                )
            );

        assert.equal(
            response.status,
            400
        );

        assert.equal(
            (
                await body(response)
            ).error,
            "invalid-request"
        );

        assert.equal(
            deps.persistence
                .received.length,
            0
        );
    }
);

test(
    "quote request API rejects non-object JSON through domain boundary",
    async () => {
        const deps =
            dependencies();

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    JSON.stringify(
                        [
                            "not",
                            "an",
                            "object"
                        ]
                    )
                )
            );

        assert.equal(
            response.status,
            400
        );
    }
);

test(
    "quote request API rejects invalid domain input without persistence",
    async () => {
        const deps =
            dependencies();

        const invalid = {
            ...validBody(),
            owner:
                "public-caller"
        };

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    JSON.stringify(
                        invalid
                    )
                )
            );

        assert.equal(
            response.status,
            400
        );

        assert.equal(
            deps.persistence
                .received.length,
            0
        );
    }
);

test(
    "quote request API converts persistence failure to stable 500 response",
    async () => {
        const deps =
            dependencies();

        deps.persistence.error =
            new Error(
                "raw database detail must not escape"
            );

        const response =
            await createInsuranceQuoteRequestApi(
                deps
            )(
                request(
                    JSON.stringify(
                        validBody()
                    )
                )
            );

        assert.equal(
            response.status,
            500
        );

        const responseBody =
            await body(response);

        assert.deepEqual(
            responseBody,
            {
                ok:
                    false,
                error:
                    "quote-request-failed"
            }
        );

        assert.equal(
            JSON.stringify(
                responseBody
            ).includes(
                "raw database"
            ),
            false
        );
    }
);

test(
    "quote request API responses disable caching",
    async () => {
        const response =
            await createInsuranceQuoteRequestApi(
                dependencies()
            )(
                request(
                    JSON.stringify(
                        validBody()
                    )
                )
            );

        assert.equal(
            response.headers
                .get(
                    "cache-control"
                ),
            "no-store"
        );
    }
);
