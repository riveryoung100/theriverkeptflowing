import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    buildRiverCrmRelationshipFromForm,
    isSameOriginRiverCrmWriteRequest,
    requireRiverCrmRelationshipId
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

    const persistence =
        createD1RiverCrmPersistence(
            database
        );

    try {

        const formData =
            await request.formData();

        const relationshipId =
            requireRiverCrmRelationshipId(
                formData.get(
                    "relationshipId"
                )
            );

        const existing =
            await persistence.get(
                relationshipId
            );

        if (existing === undefined) {

            return new Response(
                "River CRM relationship was not found.",
                {
                    status:
                        404,

                    headers: {
                        "cache-control":
                            "no-store"
                    }
                }
            );

        }

        const relationship =
            buildRiverCrmRelationshipFromForm(
                formData,
                {
                    relationshipId,
                    existing
                }
            );

        await persistence.upsert(
            relationship
        );

    }
    catch {

        return new Response(
            "Invalid River CRM relationship update.",
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

    return redirect(
        "/river-os/crm?updated=1",
        303
    );

};