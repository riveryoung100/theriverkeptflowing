export const INSURANCE_COMPLETE_CREATED_AT_COHORT_VERSION =
    "insurance-complete-created-at-cohort-v1" as const;


export interface InsuranceCreatedAtCohortRelationship {
    readonly relationshipId:
        string;

    readonly createdAt:
        string;
}


export interface InsuranceCreatedAtCohortCursor {
    readonly createdAt:
        string;

    readonly relationshipId:
        string;
}


export interface InsuranceCreatedAtCohortPageQuery {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly pageSize?:
        number;

    readonly cursor?:
        InsuranceCreatedAtCohortCursor;
}


export interface InsuranceCreatedAtCohortPage {
    readonly relationships:
        readonly InsuranceCreatedAtCohortRelationship[];

    readonly hasMore:
        boolean;

    readonly nextCursor?:
        InsuranceCreatedAtCohortCursor;
}


export interface InsuranceCreatedAtCohortPageReader {
    listCreatedAtRangePage(
        query:
            InsuranceCreatedAtCohortPageQuery
    ): Promise<
        InsuranceCreatedAtCohortPage
    >;
}


export interface LoadCompleteInsuranceCreatedAtCohortInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly pageSize?:
        number;
}


export interface InsuranceCompleteCreatedAtCohort {
    readonly version:
        typeof INSURANCE_COMPLETE_CREATED_AT_COHORT_VERSION;

    readonly relationships:
        readonly InsuranceCreatedAtCohortRelationship[];

    readonly relationshipCount:
        number;

    readonly pageCount:
        number;

    readonly isComplete:
        true;
}


function requireCanonicalUtcTimestamp(
    value:
        unknown,
    field:
        string
): string {
    if(
        typeof value !== "string" ||
        value.trim() !== value
    ){
        throw new TypeError(
            `Insurance complete created-at cohort requires ${field} to be a canonical UTC ISO timestamp.`
        );
    }

    const parsed =
        new Date(
            value
        );

    if(
        Number.isNaN(
            parsed.getTime()
        ) ||
        parsed.toISOString() !== value
    ){
        throw new TypeError(
            `Insurance complete created-at cohort requires ${field} to be a canonical UTC ISO timestamp.`
        );
    }

    return value;
}


function requireRelationshipId(
    value:
        unknown,
    field:
        string
): string {
    if(
        typeof value !== "string" ||
        value.trim() !== value ||
        !value.startsWith(
            "relationship:"
        ) ||
        value.length <=
            "relationship:".length
    ){
        throw new TypeError(
            `Insurance complete created-at cohort requires ${field} to be a canonical relationship identity.`
        );
    }

    return value;
}


function requirePageSize(
    value:
        unknown
): number {
    if(
        !Number.isInteger(
            value
        ) ||
        typeof value !== "number" ||
        value < 1 ||
        value > 100
    ){
        throw new TypeError(
            "Insurance complete created-at cohort pageSize must be an integer from 1 through 100."
        );
    }

    return value;
}


function cursorKey(
    cursor:
        InsuranceCreatedAtCohortCursor
): string {
    return [
        cursor.createdAt,
        cursor.relationshipId
    ].join(
        "\u0000"
    );
}


function requirePage(
    value:
        InsuranceCreatedAtCohortPage,
    range: {
        readonly createdAtFromInclusive:
            string;

        readonly createdAtToExclusive:
            string;
    }
): InsuranceCreatedAtCohortPage {
    if(
        typeof value !== "object" ||
        value === null ||
        !Array.isArray(
            value.relationships
        ) ||
        typeof value.hasMore !== "boolean"
    ){
        throw new TypeError(
            "Insurance complete created-at cohort page reader returned a malformed page."
        );
    }

    for(
        let index = 0;
        index < value.relationships.length;
        index++
    ){
        const relationship =
            value.relationships[index];

        if(
            typeof relationship !== "object" ||
            relationship === null
        ){
            throw new TypeError(
                "Insurance complete created-at cohort page reader returned a malformed relationship."
            );
        }

        requireRelationshipId(
            relationship.relationshipId,
            `relationships[${index}].relationshipId`
        );

        const createdAt =
            requireCanonicalUtcTimestamp(
                relationship.createdAt,
                `relationships[${index}].createdAt`
            );

        if(
            createdAt <
                range.createdAtFromInclusive ||
            createdAt >=
                range.createdAtToExclusive
        ){
            throw new RangeError(
                "Insurance complete created-at cohort page reader returned a relationship outside the requested created-at range."
            );
        }
    }

    if(value.hasMore){
        if(value.relationships.length === 0){
            throw new RangeError(
                "Insurance complete created-at cohort page reader cannot report hasMore for an empty page."
            );
        }

        if(value.nextCursor === undefined){
            throw new RangeError(
                "Insurance complete created-at cohort page reader must provide nextCursor when hasMore is true."
            );
        }

        if(
            typeof value.nextCursor !== "object" ||
            value.nextCursor === null
        ){
            throw new TypeError(
                "Insurance complete created-at cohort page reader returned a malformed nextCursor."
            );
        }

        requireCanonicalUtcTimestamp(
            value.nextCursor.createdAt,
            "nextCursor.createdAt"
        );

        requireRelationshipId(
            value.nextCursor.relationshipId,
            "nextCursor.relationshipId"
        );

        const finalRelationship =
            value.relationships[
                value.relationships.length - 1
            ];

        if(
            finalRelationship === undefined ||
            value.nextCursor.createdAt !==
                finalRelationship.createdAt ||
            value.nextCursor.relationshipId !==
                finalRelationship.relationshipId
        ){
            throw new RangeError(
                "Insurance complete created-at cohort continuation cursor must identify the final relationship returned by the page."
            );
        }
    }
    else if(value.nextCursor !== undefined){
        throw new RangeError(
            "Insurance complete created-at cohort page reader must omit nextCursor when hasMore is false."
        );
    }

    return value;
}


export async function loadCompleteInsuranceCreatedAtCohort(
    reader:
        InsuranceCreatedAtCohortPageReader,
    input:
        LoadCompleteInsuranceCreatedAtCohortInput
): Promise<InsuranceCompleteCreatedAtCohort> {
    const createdAtFromInclusive =
        requireCanonicalUtcTimestamp(
            input.createdAtFromInclusive,
            "createdAtFromInclusive"
        );

    const createdAtToExclusive =
        requireCanonicalUtcTimestamp(
            input.createdAtToExclusive,
            "createdAtToExclusive"
        );

    if(
        createdAtFromInclusive >=
        createdAtToExclusive
    ){
        throw new TypeError(
            "Insurance complete created-at cohort requires createdAtFromInclusive to be earlier than createdAtToExclusive."
        );
    }

    const pageSize =
        requirePageSize(
            input.pageSize ??
            100
        );

    const relationships:
        InsuranceCreatedAtCohortRelationship[] = [];

    const seenRelationshipIds =
        new Set<string>();

    const seenContinuationCursors =
        new Set<string>();

    let cursor:
        InsuranceCreatedAtCohortCursor | undefined;

    let pageCount =
        0;

    while(true){
        const page =
            requirePage(
                await reader
                    .listCreatedAtRangePage({
                        createdAtFromInclusive,
                        createdAtToExclusive,
                        pageSize,

                        ...(cursor !== undefined
                            ? {
                                cursor
                            }
                            : {})
                    }),
                {
                    createdAtFromInclusive,
                    createdAtToExclusive
                }
            );

        pageCount +=
            1;

        for(const relationship of page.relationships){
            if(
                seenRelationshipIds.has(
                    relationship.relationshipId
                )
            ){
                continue;
            }

            seenRelationshipIds.add(
                relationship.relationshipId
            );

            relationships.push({
                relationshipId:
                    relationship.relationshipId,

                createdAt:
                    relationship.createdAt
            });
        }

        if(!page.hasMore){
            break;
        }

        const nextCursor =
            page.nextCursor;

        if(nextCursor === undefined){
            throw new RangeError(
                "Insurance complete created-at cohort page reader must provide nextCursor when hasMore is true."
            );
        }

        const nextCursorKey =
            cursorKey(
                nextCursor
            );

        if(
            seenContinuationCursors.has(
                nextCursorKey
            )
        ){
            throw new RangeError(
                "Insurance complete created-at cohort page reader returned a repeated continuation cursor."
            );
        }

        if(
            cursor !== undefined &&
            cursor.createdAt ===
                nextCursor.createdAt &&
            cursor.relationshipId ===
                nextCursor.relationshipId
        ){
            throw new RangeError(
                "Insurance complete created-at cohort page reader returned a non-advancing continuation cursor."
            );
        }

        seenContinuationCursors.add(
            nextCursorKey
        );

        cursor =
            nextCursor;
    }

    return {
        version:
            INSURANCE_COMPLETE_CREATED_AT_COHORT_VERSION,

        relationships,

        relationshipCount:
            relationships.length,

        pageCount,

        isComplete:
            true
    };
}
