export const RIVER_CONTENT_TRANSCRIPT_ACTION_STATUS =
    "authorization-required" as const;

export function requireRiverContentActionSourceId(
    value:
        unknown
): string {

    if (
        typeof value !==
        "string"
    ) {

        throw new TypeError(
            "River content action sourceId must be a string."
        );

    }

    const sourceId =
        value.trim();

    if (
        !sourceId.startsWith(
            "source:"
        ) ||
        sourceId.length <=
            "source:".length
    ) {

        throw new TypeError(
            "River content action sourceId is invalid."
        );

    }

    return sourceId;

}

export function buildRiverContentTranscriptActionPath():
    string {

    return "/river-os/actions/transcript";

}

export function buildRiverContentTranscriptActionReturnPath(
    sourceId:
        string
): string {

    const validSourceId =
        requireRiverContentActionSourceId(
            sourceId
        );

    return (
        "/river-os/source?sourceId=" +
        encodeURIComponent(
            validSourceId
        ) +
        "&transcriptAction=" +
        RIVER_CONTENT_TRANSCRIPT_ACTION_STATUS
    );

}
