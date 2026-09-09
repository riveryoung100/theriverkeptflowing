import type {
    APIRoute
} from "astro";

import {
    buildRiverContentTranscriptActionReturnPath,
    requireRiverContentActionSourceId
} from "../../../lib/river-os/content-engine-actions";

export const prerender =
    false;

export const POST:
    APIRoute =
async ({
    request,
    redirect
}) => {

    const formData =
        await request.formData();

    let sourceId:
        string;

    try {

        sourceId =
            requireRiverContentActionSourceId(
                formData.get(
                    "sourceId"
                )
            );

    }
    catch {

        return new Response(
            "Invalid River content source.",
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
        buildRiverContentTranscriptActionReturnPath(
            sourceId
        ),
        303
    );

};
