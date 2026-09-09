import type {
    RiverContentCatalogEntry
} from "./content-catalog";

export type RiverRepurposeTargetId =
    | "essay"
    | "guide"
    | "letter"
    | "journal"
    | "film"
    | "clips"
    | "newsletter"
    | "platform";

export type RiverRepurposeTargetKind =
    | "site-collection"
    | "downstream-plan";

export type RiverRepurposeTargetState =
    | "ready"
    | "waiting";

export interface RiverRepurposeTarget {
    id:
        RiverRepurposeTargetId;
    label:
        string;
    kind:
        RiverRepurposeTargetKind;
    destination:
        string;
    state:
        RiverRepurposeTargetState;
    stateLabel:
        string;
    description:
        string;
    requiredFields:
        readonly string[];
}

export interface RiverRepurposePlan {
    sourceId:
        string;
    transcriptAvailable:
        boolean;
    targets:
        readonly RiverRepurposeTarget[];
}

const sharedCollectionFields =
    [
        "title",
        "description",
        "published",
        "author",
        "draft",
        "featured",
        "tags"
    ] as const;

function collectionTarget(
    id:
        RiverRepurposeTargetId,
    label:
        string,
    destination:
        string,
    transcriptAvailable:
        boolean,
    requiredFields:
        readonly string[],
    description:
        string
): RiverRepurposeTarget {

    return {
        id,
        label,
        kind:
            "site-collection",
        destination,
        state:
            transcriptAvailable
                ? "ready"
                : "waiting",
        stateLabel:
            transcriptAvailable
                ? "Ready to plan"
                : "Waiting for transcript",
        description,
        requiredFields
    };

}

function downstreamTarget(
    id:
        RiverRepurposeTargetId,
    label:
        string,
    destination:
        string,
    transcriptAvailable:
        boolean,
    description:
        string
): RiverRepurposeTarget {

    return {
        id,
        label,
        kind:
            "downstream-plan",
        destination,
        state:
            transcriptAvailable
                ? "ready"
                : "waiting",
        stateLabel:
            transcriptAvailable
                ? "Ready to plan"
                : "Waiting for transcript",
        description,
        requiredFields:
            []
    };

}

export function createRiverRepurposePlan(
    entry:
        RiverContentCatalogEntry
): RiverRepurposePlan {

    const transcriptAvailable =
        entry.transcriptState ===
        "available";

    return {
        sourceId:
            entry.sourceId,
        transcriptAvailable,
        targets: [
            collectionTarget(
                "essay",
                "Essay",
                "src/content/essays",
                transcriptAvailable,
                [
                    ...sharedCollectionFields,
                    "category",
                    "readingMinutes"
                ],
                "Shape the source into a reflective long-form essay using the site's existing essay collection."
            ),
            collectionTarget(
                "guide",
                "River Guide",
                "src/content/guides",
                transcriptAvailable,
                [
                    ...sharedCollectionFields,
                    "category",
                    "guideNumber",
                    "version",
                    "readingMinutes"
                ],
                "Turn durable teaching from the source into a structured River Guide."
            ),
            collectionTarget(
                "letter",
                "Letter",
                "src/content/letters",
                transcriptAvailable,
                [
                    ...sharedCollectionFields,
                    "recipient",
                    "letterNumber"
                ],
                "Reframe the source as a direct personal letter while preserving its central message."
            ),
            collectionTarget(
                "journal",
                "Journal",
                "src/content/journal",
                transcriptAvailable,
                [
                    ...sharedCollectionFields,
                    "season",
                    "location"
                ],
                "Capture the lived moment, lesson, or season behind the source as a journal entry."
            ),
            collectionTarget(
                "film",
                "Film",
                "src/content/films",
                transcriptAvailable,
                [
                    ...sharedCollectionFields,
                    "platform",
                    "videoUrl",
                    "durationMinutes"
                ],
                "Prepare the published video and full transcript for the site's Film collection."
            ),
            downstreamTarget(
                "clips",
                "Clips",
                "Content engine",
                transcriptAvailable,
                "Plan short-form excerpts and clip candidates without creating or publishing media."
            ),
            downstreamTarget(
                "newsletter",
                "Newsletter",
                "Content engine",
                transcriptAvailable,
                "Plan an email or newsletter adaptation without sending anything."
            ),
            downstreamTarget(
                "platform",
                "Platform assets",
                "Content engine",
                transcriptAvailable,
                "Plan platform-native titles, descriptions, captions, and post variants without publishing."
            )
        ]
    };

}
