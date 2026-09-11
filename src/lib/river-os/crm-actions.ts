import {
    createRiverCrmRelationship
} from "./crm-workspace";

import type {
    RiverCrmPipelineStage,
    RiverCrmRelationship,
    RiverCrmRelationshipKind
} from "./crm-workspace";


const SUPPORTED_KINDS:
    readonly RiverCrmRelationshipKind[] = [
        "lead",
        "client",
        "recruit",
        "partner"
    ];

const SUPPORTED_STAGES:
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


function normalizedRequiredField(
    value:
        FormDataEntryValue | null,
    field:
        string
): string {

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {

        throw new TypeError(
            `River CRM requires ${field}.`
        );

    }

    return value.trim();

}


function normalizedOptionalField(
    value:
        FormDataEntryValue | null
): string | undefined {

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {

        return undefined;

    }

    return value.trim();

}


function relationshipKind(
    value:
        FormDataEntryValue | null
): RiverCrmRelationshipKind {

    const normalized =
        normalizedRequiredField(
            value,
            "relationship kind"
        );

    if (
        !SUPPORTED_KINDS.includes(
            normalized as
                RiverCrmRelationshipKind
        )
    ) {

        throw new TypeError(
            "River CRM relationship kind is not supported."
        );

    }

    return normalized as
        RiverCrmRelationshipKind;

}


function pipelineStage(
    value:
        FormDataEntryValue | null
): RiverCrmPipelineStage {

    const normalized =
        normalizedRequiredField(
            value,
            "pipeline stage"
        );

    if (
        !SUPPORTED_STAGES.includes(
            normalized as
                RiverCrmPipelineStage
        )
    ) {

        throw new TypeError(
            "River CRM pipeline stage is not supported."
        );

    }

    return normalized as
        RiverCrmPipelineStage;

}


export interface BuildRiverCrmRelationshipOptions {
    readonly relationshipId:
        string;

    readonly existing?:
        RiverCrmRelationship;

    readonly now?:
        Date;
}


export function buildRiverCrmRelationshipFromForm(
    formData:
        FormData,
    options:
        BuildRiverCrmRelationshipOptions
): RiverCrmRelationship {

    const now =
        options.now ??
        new Date();

    const timestamp =
        now.toISOString();

    const email =
        normalizedOptionalField(
            formData.get(
                "email"
            )
        );

    const phone =
        normalizedOptionalField(
            formData.get(
                "phone"
            )
        );

    const owner =
        normalizedOptionalField(
            formData.get(
                "owner"
            )
        );

    return createRiverCrmRelationship({
        relationshipId:
            options.relationshipId,

        displayName:
            normalizedRequiredField(
                formData.get(
                    "displayName"
                ),
                "display name"
            ),

        kind:
            relationshipKind(
                formData.get(
                    "kind"
                )
            ),

        stage:
            pipelineStage(
                formData.get(
                    "stage"
                )
            ),

        source:
            normalizedRequiredField(
                formData.get(
                    "source"
                ),
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
            options.existing
                ?.nextFollowUpAt === undefined
                ? {}
                : {
                    nextFollowUpAt:
                        options.existing
                            .nextFollowUpAt
                }
        ),

        ...(
            options.existing
                ?.appointmentAt === undefined
                ? {}
                : {
                    appointmentAt:
                        options.existing
                            .appointmentAt
                }
        ),

        createdAt:
            options.existing
                ?.createdAt ??
            timestamp,

        updatedAt:
            timestamp
    });

}

export function requireRiverCrmRelationshipId(
    value:
        FormDataEntryValue | null
): string {

    const relationshipId =
        normalizedRequiredField(
            value,
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
            "River CRM requires a valid relationship identity."
        );

    }

    return relationshipId;

}

export function isSameOriginRiverCrmWriteRequest(
    request:
        Request
): boolean {

    const origin =
        request.headers.get(
            "origin"
        );

    if (origin === null) {

        return false;

    }

    try {

        return (
            new URL(
                origin
            ).origin ===
            new URL(
                request.url
            ).origin
        );

    }
    catch {

        return false;

    }

}