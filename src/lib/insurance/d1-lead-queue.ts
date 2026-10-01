import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import type {
    RiverCrmPipelineStage,
    RiverCrmRelationship,
    RiverCrmRelationshipKind
} from "../river-os/crm-workspace";


export const INSURANCE_LEAD_QUEUE_PAGE_SIZE =
    100;


interface InsuranceRelationshipRow {
    readonly relationship_id:
        unknown;

    readonly display_name:
        unknown;

    readonly kind:
        unknown;

    readonly stage:
        unknown;

    readonly source:
        unknown;

    readonly email:
        unknown;

    readonly phone:
        unknown;

    readonly owner:
        unknown;

    readonly next_follow_up_at:
        unknown;

    readonly appointment_at:
        unknown;

    readonly created_at:
        unknown;

    readonly updated_at:
        unknown;
}


export interface InsuranceLeadQueueCursor {
    readonly createdAt:
        string;

    readonly relationshipId:
        string;
}


export interface InsuranceLeadQueuePageQuery {
    readonly pageSize?:
        number;

    readonly cursor?:
        InsuranceLeadQueueCursor;
}


export interface InsuranceLeadQueuePage {
    readonly relationships:
        readonly RiverCrmRelationship[];

    readonly hasMore:
        boolean;

    readonly nextCursor?:
        InsuranceLeadQueueCursor;
}


export interface D1InsuranceLeadQueuePersistence {
    listPage(
        query?:
            InsuranceLeadQueuePageQuery
    ): Promise<InsuranceLeadQueuePage>;

    listComplete(
        pageSize?:
            number
    ): Promise<readonly RiverCrmRelationship[]>;
}


function requiredText(
    value:
        unknown,
    field:
        string
):
    string {

    if(
        typeof value !== "string" ||
        value.trim().length === 0
    ){
        throw new TypeError(
            `Insurance lead queue D1 row requires ${field}.`
        );
    }

    return value.trim();
}


function optionalText(
    value:
        unknown,
    field:
        string
):
    string | undefined {

    if(
        value === null ||
        value === undefined
    ){
        return undefined;
    }

    return requiredText(
        value,
        field
    );
}


function canonicalUtcTimestamp(
    value:
        unknown,
    field:
        string
):
    string {

    const timestamp =
        requiredText(
            value,
            field
        );

    const parsed =
        new Date(
            timestamp
        );

    if(
        Number.isNaN(
            parsed.getTime()
        ) ||
        parsed.toISOString() !==
            timestamp
    ){
        throw new TypeError(
            `Insurance lead queue requires ${field} to be a canonical UTC timestamp.`
        );
    }

    return timestamp;
}


function canonicalRelationshipId(
    value:
        unknown
):
    string {

    const relationshipId =
        requiredText(
            value,
            "relationshipId"
        );

    if(
        !relationshipId.startsWith(
            "relationship:"
        ) ||
        relationshipId.length <=
            "relationship:".length
    ){
        throw new TypeError(
            "Insurance lead queue requires canonical relationship identity."
        );
    }

    return relationshipId;
}


function requirePageSize(
    value:
        number
):
    number {

    if(
        !Number.isInteger(
            value
        ) ||
        value <= 0 ||
        value >
            INSURANCE_LEAD_QUEUE_PAGE_SIZE
    ){
        throw new TypeError(
            "Insurance lead queue page size must be an integer from 1 through 100."
        );
    }

    return value;
}


function requirePageQuery(
    query:
        InsuranceLeadQueuePageQuery =
            {}
): {
    readonly pageSize:
        number;

    readonly cursor?:
        InsuranceLeadQueueCursor;
} {

    if(
        typeof query !== "object" ||
        query === null
    ){
        throw new TypeError(
            "Insurance lead queue page requires a query object when provided."
        );
    }

    const pageSize =
        requirePageSize(
            query.pageSize ??
                INSURANCE_LEAD_QUEUE_PAGE_SIZE
        );

    if(query.cursor === undefined){
        return {
            pageSize
        };
    }

    if(
        typeof query.cursor !== "object" ||
        query.cursor === null
    ){
        throw new TypeError(
            "Insurance lead queue cursor must be an object."
        );
    }

    return {
        pageSize,

        cursor: {
            createdAt:
                canonicalUtcTimestamp(
                    query.cursor.createdAt,
                    "cursor.createdAt"
                ),

            relationshipId:
                canonicalRelationshipId(
                    query.cursor.relationshipId
                )
        }
    };
}


function rowToRelationship(
    row:
        InsuranceRelationshipRow
):
    RiverCrmRelationship {

    return createRiverCrmRelationship({
        relationshipId:
            canonicalRelationshipId(
                row.relationship_id
            ),

        displayName:
            requiredText(
                row.display_name,
                "display_name"
            ),

        kind:
            requiredText(
                row.kind,
                "kind"
            ) as RiverCrmRelationshipKind,

        stage:
            requiredText(
                row.stage,
                "stage"
            ) as RiverCrmPipelineStage,

        source:
            requiredText(
                row.source,
                "source"
            ),

        email:
            optionalText(
                row.email,
                "email"
            ),

        phone:
            optionalText(
                row.phone,
                "phone"
            ),

        owner:
            optionalText(
                row.owner,
                "owner"
            ),

        nextFollowUpAt:
            optionalText(
                row.next_follow_up_at,
                "next_follow_up_at"
            ),

        appointmentAt:
            optionalText(
                row.appointment_at,
                "appointment_at"
            ),

        createdAt:
            canonicalUtcTimestamp(
                row.created_at,
                "created_at"
            ),

        updatedAt:
            canonicalUtcTimestamp(
                row.updated_at,
                "updated_at"
            )
    });
}


function rowsFromResult(
    result:
        unknown
):
    readonly InsuranceRelationshipRow[] {

    if(
        typeof result !== "object" ||
        result === null ||
        !("results" in result) ||
        !Array.isArray(
            result.results
        )
    ){
        throw new TypeError(
            "Insurance lead queue D1 query returned an invalid result."
        );
    }

    return result.results as
        readonly InsuranceRelationshipRow[];
}


function cursorKey(
    cursor:
        InsuranceLeadQueueCursor
):
    string {

    return `${cursor.createdAt}\u0000${cursor.relationshipId}`;
}


export function createD1InsuranceLeadQueuePersistence(
    database:
        D1Database
):
    D1InsuranceLeadQueuePersistence {

    const listPage =
        async (
            query:
                InsuranceLeadQueuePageQuery =
                    {}
        ):
            Promise<InsuranceLeadQueuePage> => {

            const validated =
                requirePageQuery(
                    query
                );

            const probeLimit =
                validated.pageSize + 1;

            const result =
                validated.cursor === undefined
                    ? await database
                        .prepare(
                            `
                                SELECT
                                    relationships.*
                                FROM river_crm_relationships AS relationships
                                INNER JOIN river_crm_insurance_lead_profiles AS insurance
                                    ON insurance.relationship_id = relationships.relationship_id
                                ORDER BY
                                    relationships.created_at DESC,
                                    relationships.relationship_id ASC
                                LIMIT ?1
                            `
                        )
                        .bind(
                            probeLimit
                        )
                        .all<InsuranceRelationshipRow>()
                    : await database
                        .prepare(
                            `
                                SELECT
                                    relationships.*
                                FROM river_crm_relationships AS relationships
                                INNER JOIN river_crm_insurance_lead_profiles AS insurance
                                    ON insurance.relationship_id = relationships.relationship_id
                                WHERE (
                                    relationships.created_at < ?1
                                    OR (
                                        relationships.created_at = ?1
                                        AND relationships.relationship_id > ?2
                                    )
                                )
                                ORDER BY
                                    relationships.created_at DESC,
                                    relationships.relationship_id ASC
                                LIMIT ?3
                            `
                        )
                        .bind(
                            validated.cursor.createdAt,
                            validated.cursor.relationshipId,
                            probeLimit
                        )
                        .all<InsuranceRelationshipRow>();

            const rows =
                rowsFromResult(
                    result
                );

            const pageRows =
                rows.slice(
                    0,
                    validated.pageSize
                );

            const relationships =
                pageRows.map(
                    rowToRelationship
                );

            const hasMore =
                rows.length >
                validated.pageSize;

            if(!hasMore){
                return {
                    relationships,

                    hasMore:
                        false
                };
            }

            const lastRelationship =
                relationships[
                    relationships.length - 1
                ];

            if(lastRelationship === undefined){
                throw new RangeError(
                    "Insurance lead queue cannot derive a continuation cursor from an empty page."
                );
            }

            return {
                relationships,

                hasMore:
                    true,

                nextCursor: {
                    createdAt:
                        lastRelationship.createdAt,

                    relationshipId:
                        lastRelationship.relationshipId
                }
            };
        };

    return {
        listPage,

        async listComplete(
            pageSize:
                number =
                    INSURANCE_LEAD_QUEUE_PAGE_SIZE
        ){
            requirePageSize(
                pageSize
            );

            const relationships:
                RiverCrmRelationship[] =
                    [];

            const seenRelationships =
                new Set<string>();

            const seenCursors =
                new Set<string>();

            let cursor:
                InsuranceLeadQueueCursor |
                undefined;

            while(true){
                const page =
                    await listPage({
                        pageSize,

                        ...(cursor === undefined
                            ? {}
                            : {
                                cursor
                            })
                    });

                for(
                    const relationship of
                    page.relationships
                ){
                    if(
                        seenRelationships.has(
                            relationship.relationshipId
                        )
                    ){
                        throw new RangeError(
                            "Insurance lead queue returned a duplicate relationship across pages."
                        );
                    }

                    seenRelationships.add(
                        relationship.relationshipId
                    );

                    relationships.push(
                        relationship
                    );
                }

                if(!page.hasMore){
                    return relationships;
                }

                if(page.nextCursor === undefined){
                    throw new RangeError(
                        "Insurance lead queue page must provide nextCursor when hasMore is true."
                    );
                }

                const key =
                    cursorKey(
                        page.nextCursor
                    );

                if(
                    seenCursors.has(
                        key
                    )
                ){
                    throw new RangeError(
                        "Insurance lead queue returned a repeated continuation cursor."
                    );
                }

                seenCursors.add(
                    key
                );

                cursor =
                    page.nextCursor;
            }
        }
    };
}
