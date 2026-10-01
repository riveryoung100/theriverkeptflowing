import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    createD1InsuranceLeadFollowUpExecutor,
    InsuranceLeadFollowUpConflictError
} from "../../../lib/insurance/d1-lead-follow-up";

import {
    buildInsurancePrivateFollowUpRequestFromForm
} from "../../../lib/insurance/private-follow-up-request";

import {
    isSameOriginRiverCrmWriteRequest
} from "../../../lib/river-os/crm-actions";

import {
    createD1RiverCrmPersistence
} from "../../../lib/river-os/d1-crm";


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
    request,
    redirect
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

    if(database === undefined){
        return noStoreResponse(
            "River CRM database is unavailable.",
            503
        );
    }

    let target;

    try {
        target =
            buildInsurancePrivateFollowUpRequestFromForm(
                await request.formData()
            );
    }
    catch {
        return noStoreResponse(
            "Invalid insurance lead follow-up request.",
            400
        );
    }

    let relationship;

    try {
        relationship =
            await createD1RiverCrmPersistence(
                database
            ).get(
                target.relationshipId
            );
    }
    catch {
        return noStoreResponse(
            "Insurance lead follow-up relationship could not be loaded.",
            503
        );
    }

    if(relationship === undefined){
        return noStoreResponse(
            "River CRM relationship was not found.",
            404
        );
    }

    try {
        const result =
            await createD1InsuranceLeadFollowUpExecutor(
                database
            ).execute({
                relationship,

                nextFollowUpAt:
                    target.nextFollowUpAt,

                occurredAt:
                    new Date()
                        .toISOString()
            });

        return redirect(
            `/river-os/crm?followUp=${result.outcome}`,
            303
        );
    }
    catch(error){
        if(
            error instanceof
                InsuranceLeadFollowUpConflictError
        ){
            return noStoreResponse(
                "Insurance lead follow-up changed concurrently.",
                409
            );
        }

        if(error instanceof TypeError){
            return noStoreResponse(
                "Invalid insurance lead follow-up.",
                400
            );
        }

        return noStoreResponse(
            "Insurance lead follow-up could not be saved.",
            503
        );
    }
};
