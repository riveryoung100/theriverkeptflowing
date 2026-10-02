import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    createD1InsuranceLeadAppointmentExecutor,
    InsuranceLeadAppointmentConflictError
} from "../../../lib/insurance/d1-lead-appointment";

import {
    buildInsurancePrivateAppointmentRequestFromForm
} from "../../../lib/insurance/private-appointment-request";

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
            buildInsurancePrivateAppointmentRequestFromForm(
                formData
            );

        viewContext =
            buildInsurancePrivateCrmViewContextFromForm(
                formData
            );
    }
    catch {
        return noStoreResponse(
            "Invalid insurance lead appointment request.",
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
            "Insurance lead appointment relationship could not be loaded.",
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
            await createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship,

                appointmentAt:
                    target.appointmentAt,

                occurredAt:
                    new Date()
                        .toISOString(),

                ...(
                    target.operation ===
                        "schedule"
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
                "appointment",
                result.outcome,
                viewContext
            ),
            303
        );
    }
    catch(error){
        if(
            error instanceof
                InsuranceLeadAppointmentConflictError
        ){
            return noStoreResponse(
                "Insurance lead appointment changed concurrently.",
                409
            );
        }

        if(error instanceof TypeError){
            return noStoreResponse(
                "Invalid insurance lead appointment.",
                400
            );
        }

        return noStoreResponse(
            "Insurance lead appointment could not be saved.",
            503
        );
    }
};
