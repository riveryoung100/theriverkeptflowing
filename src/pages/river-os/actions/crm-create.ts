import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    buildRiverCrmRelationshipFromForm,
    isSameOriginRiverCrmWriteRequest
} from "../../../lib/river-os/crm-actions";

import {
    createD1RiverCrmPersistence
} from "../../../lib/river-os/d1-crm";


export const prerender =
    false;


export const POST:
    APIRoute =
async ({
    request,
    redirect
}) => {

    if (
        !isSameOriginRiverCrmWriteRequest(
            request
        )
    ) {

        return new Response(
            "River CRM write request was rejected.",
            {
                status:
                    403,

                headers: {
                    "cache-control":
                        "no-store"
                }
            }
        );

    }

    const runtimeEnvironment =
        env as unknown as
            Record<string, unknown>;

    const database =
        runtimeEnvironment
            .RIVER_CRM_DB as
                D1Database | undefined;

    if (database === undefined) {

        return new Response(
            "River CRM database is unavailable.",
            {
                status:
                    503,

                headers: {
                    "cache-control":
                        "no-store"
                }
            }
        );

    }

    let relationship;

    try {

        const formData =
            await request.formData();

        relationship =
            buildRiverCrmRelationshipFromForm,
    isSameOriginRiverCrmWriteRequest(
                formData,
                {
                    relationshipId:
                        `relationship:${crypto.randomUUID()}`
                }
            );

    }
    catch {

        return new Response(
            "Invalid River CRM relationship.",
            {
                status:
                    400,

                headers: {
                    "cache-control":
                        "no-store"
                }
            }
        );

    }

    try {

        await createD1RiverCrmPersistence(
            database
        ).upsert(
            relationship
        );

    }
    catch {

        return new Response(
            "River CRM relationship could not be saved.",
            {
                status:
                    503,

                headers: {
                    "cache-control":
                        "no-store"
                }
            }
        );

    }

    return redirect(
        "/river-os/crm?created=1",
        303
    );

};