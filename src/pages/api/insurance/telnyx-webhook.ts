import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    createD1TelnyxWebhookApplicationService
} from "../../../lib/insurance/d1-telnyx-webhook-application";

import {
    importTelnyxWebhookPublicKey
} from "../../../lib/insurance/telnyx-webhook-public-key";

import {
    handleTelnyxWebhook
} from "../../../lib/insurance/telnyx-webhook-route";


export const prerender =
    false;


function unavailableResponse():
Response {
    return new Response(
        JSON.stringify({
            ok:
                false,
            error: {
                code:
                    "unavailable"
            }
        }),
        {
            status:
                503,
            headers: {
                "cache-control":
                    "no-store",
                "content-type":
                    "application/json; charset=utf-8"
            }
        }
    );
}


export const POST:
    APIRoute =
async ({
    request
}) => {
    try {
        const runtimeEnvironment =
            env as unknown as
                Record<
                    string,
                    unknown
                >;

        const database =
            runtimeEnvironment
                .RIVER_CRM_DB as
                    D1Database |
                    undefined;

        const publicKeyValue =
            runtimeEnvironment
                .TELNYX_WEBHOOK_PUBLIC_KEY;

        if(
            database === undefined ||
            typeof publicKeyValue !==
                "string" ||
            publicKeyValue.trim()
                .length === 0
        ){
            return unavailableResponse();
        }

        const publicKey =
            await importTelnyxWebhookPublicKey(
                publicKeyValue
            );

        return await handleTelnyxWebhook({
            request,
            publicKey,
            application:
                createD1TelnyxWebhookApplicationService(
                    database
                )
        });
    }
    catch {
        return unavailableResponse();
    }
};
