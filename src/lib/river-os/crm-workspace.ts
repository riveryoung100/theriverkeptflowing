export type RiverCrmRelationshipKind =
    "lead" |
    "client" |
    "recruit" |
    "partner";

export type RiverCrmPipelineStage =
    "new" |
    "contacted" |
    "qualified" |
    "appointment-set" |
    "proposal" |
    "won" |
    "lost" |
    "nurture";

export interface RiverCrmRelationship {
    readonly relationshipId:
        string;

    readonly displayName:
        string;

    readonly kind:
        RiverCrmRelationshipKind;

    readonly stage:
        RiverCrmPipelineStage;

    readonly source:
        string;

    readonly email?:
        string;

    readonly phone?:
        string;

    readonly owner?:
        string;

    readonly nextFollowUpAt?:
        string;

    readonly appointmentAt?:
        string;

    readonly createdAt:
        string;

    readonly updatedAt:
        string;
}

export interface RiverCrmWorkspaceSummary {
    readonly total:
        number;

    readonly active:
        number;

    readonly appointments:
        number;

    readonly followUps:
        number;

    readonly won:
        number;

    readonly nurture:
        number;
}

const RIVER_CRM_PIPELINE_STAGES:
    readonly RiverCrmPipelineStage[] = [
        "new",
        "contacted",
        "qualified",
        "appointment-set",
        "proposal",
        "won",
        "lost",
        "nurture"
    ];

const RIVER_CRM_RELATIONSHIP_KINDS:
    readonly RiverCrmRelationshipKind[] = [
        "lead",
        "client",
        "recruit",
        "partner"
    ];

function requireNormalizedString(
    value:
        unknown,
    field:
        string
): string {

    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value
    ) {

        throw new TypeError(
            `River CRM requires a valid ${field}.`
        );

    }

    return value;

}

function optionalNormalizedString(
    value:
        unknown
): string | undefined {

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {

        return undefined;

    }

    if (
        value.trim() !== value
    ) {

        throw new TypeError(
            "River CRM optional text fields must be normalized."
        );

    }

    return value;

}

function requireIsoTimestamp(
    value:
        unknown,
    field:
        string
): string {

    const normalized =
        requireNormalizedString(
            value,
            field
        );

    if (
        Number.isNaN(
            Date.parse(
                normalized
            )
        )
    ) {

        throw new TypeError(
            `River CRM requires ${field} to be a valid timestamp.`
        );

    }

    return normalized;

}

function optionalIsoTimestamp(
    value:
        unknown,
    field:
        string
): string | undefined {

    const normalized =
        optionalNormalizedString(
            value
        );

    if (
        normalized === undefined
    ) {

        return undefined;

    }

    if (
        Number.isNaN(
            Date.parse(
                normalized
            )
        )
    ) {

        throw new TypeError(
            `River CRM requires ${field} to be a valid timestamp.`
        );

    }

    return normalized;

}

export function createRiverCrmRelationship(
    input:
        RiverCrmRelationship
): RiverCrmRelationship {

    const relationshipId =
        requireNormalizedString(
            input.relationshipId,
            "relationship identity"
        );

    if (
        !relationshipId.startsWith(
            "relationship:"
        ) ||
        relationshipId.length <=
            "relationship:".length
    ) {

        throw new TypeError(
            "River CRM relationship identity must begin with relationship:."
        );

    }

    if (
        !RIVER_CRM_RELATIONSHIP_KINDS.includes(
            input.kind
        )
    ) {

        throw new TypeError(
            "River CRM relationship kind is not supported."
        );

    }

    if (
        !RIVER_CRM_PIPELINE_STAGES.includes(
            input.stage
        )
    ) {

        throw new TypeError(
            "River CRM pipeline stage is not supported."
        );

    }

    const email =
        optionalNormalizedString(
            input.email
        );

    const phone =
        optionalNormalizedString(
            input.phone
        );

    const owner =
        optionalNormalizedString(
            input.owner
        );

    const nextFollowUpAt =
        optionalIsoTimestamp(
            input.nextFollowUpAt,
            "nextFollowUpAt"
        );

    const appointmentAt =
        optionalIsoTimestamp(
            input.appointmentAt,
            "appointmentAt"
        );

    return {
        relationshipId,

        displayName:
            requireNormalizedString(
                input.displayName,
                "display name"
            ),

        kind:
            input.kind,

        stage:
            input.stage,

        source:
            requireNormalizedString(
                input.source,
                "source"
            ),

        ...(
            email === undefined
                ? {}
                : {
                    email
                }
        ),

        ...(
            phone === undefined
                ? {}
                : {
                    phone
                }
        ),

        ...(
            owner === undefined
                ? {}
                : {
                    owner
                }
        ),

        ...(
            nextFollowUpAt === undefined
                ? {}
                : {
                    nextFollowUpAt
                }
        ),

        ...(
            appointmentAt === undefined
                ? {}
                : {
                    appointmentAt
                }
        ),

        createdAt:
            requireIsoTimestamp(
                input.createdAt,
                "createdAt"
            ),

        updatedAt:
            requireIsoTimestamp(
                input.updatedAt,
                "updatedAt"
            )
    };

}

export function summarizeRiverCrmWorkspace(
    relationships:
        readonly RiverCrmRelationship[],
    now:
        Date = new Date()
): RiverCrmWorkspaceSummary {

    const nowTime =
        now.getTime();

    return {
        total:
            relationships.length,

        active:
            relationships.filter(
                relationship =>
                    relationship.stage !== "won" &&
                    relationship.stage !== "lost"
            ).length,

        appointments:
            relationships.filter(
                relationship =>
                    relationship.appointmentAt !== undefined
            ).length,

        followUps:
            relationships.filter(
                relationship =>
                    relationship.nextFollowUpAt !== undefined &&
                    Date.parse(
                        relationship.nextFollowUpAt
                    ) <= nowTime
            ).length,

        won:
            relationships.filter(
                relationship =>
                    relationship.stage === "won"
            ).length,

        nurture:
            relationships.filter(
                relationship =>
                    relationship.stage === "nurture"
            ).length
    };

}

export function buildRiverCrmWorkspacePath():
string {

    return "/river-os/crm";

}

export interface RiverCrmPersistence {

    upsert(
        relationship:
            RiverCrmRelationship
    ): Promise<void>;

    get(
        relationshipId:
            string
    ): Promise<RiverCrmRelationship | undefined>;

    list(
        limit?:
            number
    ): Promise<readonly RiverCrmRelationship[]>;

}
