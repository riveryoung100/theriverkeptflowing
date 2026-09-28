import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    createD1InsuranceQuoteRequestPersistence
} from "../../../lib/insurance/d1-quote-request";

import type {
    InsuranceQuoteRequestD1Database
} from "../../../lib/insurance/d1-quote-request";

import {
    createInsuranceQuoteRequestApi
} from "../../../lib/insurance/http/quote-request-api";


export const prerender =
    false;

export const POST:
    APIRoute =
    async ({
        request
    }) => {
        const runtimeEnvironment =
            env as unknown as
                Record<
                    string,
                    unknown
                >;

        const database =
            runtimeEnvironment
                .RIVER_CRM_DB as
                    InsuranceQuoteRequestD1Database |
                    undefined;

        if(database === undefined){
            return new Response(
                JSON.stringify({
                    ok:
                        false,
                    error:
                        "quote-request-failed"
                }),
                {
                    status:
                        500,
                    headers: {
                        "content-type":
                            "application/json; charset=utf-8",
                        "cache-control":
                            "no-store"
                    }
                }
            );
        }

        const api =
            createInsuranceQuoteRequestApi({
                persistence:
                    createD1InsuranceQuoteRequestPersistence(
                        database
                    ),

                now(){
                    return new Date()
                        .toISOString();
                },

                createUuid(){
                    return crypto
                        .randomUUID();
                }
            });

        return await api(
            request
        );
    };
