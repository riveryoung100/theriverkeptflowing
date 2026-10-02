import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    createD1InsuranceLeadOperatingStateExecutor
} from "../../../lib/insurance/d1-lead-operating-state";

import {
    createD1InsuranceLeadProfilePersistence
} from "../../../lib/insurance/d1-lead-profile";

import {
    buildInsurancePrivateOperatingStateRequestFromForm
} from "../../../lib/insurance/private-operating-state-request";

import {
    buildInsurancePrivateCrmActionRedirect,
    buildInsurancePrivateCrmViewContextFromForm
} from "../../../lib/insurance/private-crm-view-context";

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
    let viewContext;

    try {
        const formData =
            await request.formData();

        target =
            buildInsurancePrivateOperatingStateRequestFromForm(
                formData
            );

        viewContext =
            buildInsurancePrivateCrmViewContextFromForm(
                formData
            );
    }
    catch {
        return noStoreResponse(
            "Invalid insurance lead operating-state request.",
            400
        );
    }

    let relationship;
    let profile;

    try {
        [
            relationship,
            profile
        ] =
            await Promise.all([
                createD1RiverCrmPersistence(
                    database
                ).get(
                    target.relationshipId
                ),

                createD1InsuranceLeadProfilePersistence(
                    database
                ).get(
                    target.relationshipId
                )
            ]);
    }
    catch {
        return noStoreResponse(
            "Insurance lead operating state could not be loaded.",
            503
        );
    }

    if(relationship === undefined){
        return noStoreResponse(
            "River CRM relationship was not found.",
            404
        );
    }

    if(profile === null){
        return noStoreResponse(
            "Insurance lead profile was not found.",
            404
        );
    }

    const stageChanged =
        relationship.stage !==
        target.stage;

    try {
        const result =
            await createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute({
                relationship,

                profile,

                stage:
                    target.stage,

                quoteStatus:
                    target.quoteStatus,

                assignedProducer:
                    target.assignedProducer,

                occurredAt:
                    new Date()
                        .toISOString(),

                ...(
                    stageChanged
                        ? {
                            eventId:
                                `crm-event:${crypto.randomUUID()}`,

                            eventSource:
                                "river-os"
                        }
                        : {}
                )
            });

        return redirect(
            buildInsurancePrivateCrmActionRedirect(
                "operatingState",
                result.outcome,
                viewContext
            ),
            303
        );
    }
    catch(error){
        if(error instanceof TypeError){
            return noStoreResponse(
                "Invalid insurance lead operating state.",
                400
            );
        }

        return noStoreResponse(
            "Insurance lead operating state could not be saved.",
            503
        );
    }
};
