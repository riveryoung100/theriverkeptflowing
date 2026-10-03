import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    isSameOriginRiverCrmWriteRequest
} from "../../../lib/river-os/crm-actions";

import {
    createD1RiverCrmPersistence
} from "../../../lib/river-os/d1-crm";

import {
    buildInsurancePrivateContactRequestFromForm
} from "../../../lib/insurance/private-contact-request";

import {
    createInsurancePrivateContactOrchestrationService
} from "../../../lib/insurance/private-contact-orchestration";

import {
    resolveInsuranceOutboundContactServerRuntimeComposition
} from "../../../lib/insurance/outbound-contact-server-runtime-composition";

export const prerender =
    false;


function noStoreResponse(
    body:
        string,
    status:
        number
):
    Response {

    return new Response(
        body,
        {
            status,
            headers: {
                "cache-control":
                    "no-store"
            }
        }
    );
}


export const POST:
    APIRoute =
async ({
    request
}) => {

    if(
        !isSameOriginRiverCrmWriteRequest(
            request
        )
    ){
        return noStoreResponse(
            "River CRM write request was rejected.",
            403
        );
    }

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

    if(
        database ===
            undefined
    ){
        return noStoreResponse(
            "River CRM database is unavailable.",
            503
        );
    }

    let contactRequest;

    try {
        const formData =
            await request.formData();

        contactRequest =
            buildInsurancePrivateContactRequestFromForm(
                formData
            );
    }
    catch {
        return noStoreResponse(
            "Invalid insurance contact request.",
            400
        );
    }

    const relationship =
        await createD1RiverCrmPersistence(
            database
        ).get(
            contactRequest.relationshipId
        );

    if(
        relationship ===
            undefined
    ){
        return noStoreResponse(
            "River CRM relationship was not found.",
            404
        );
    }

    const providerComposition =
        resolveInsuranceOutboundContactServerRuntimeComposition(
            runtimeEnvironment,
            globalThis.fetch
        );

    const orchestration =
        createInsurancePrivateContactOrchestrationService(
            database,
            providerComposition
        );

    if(orchestration === undefined){
        return noStoreResponse(
            "Insurance contact provider is not configured.",
            503
        );
    }

    return noStoreResponse(
        "Insurance contact provider is not configured.",
        503
    );
};
