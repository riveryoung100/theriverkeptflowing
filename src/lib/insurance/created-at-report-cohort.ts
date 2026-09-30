import {
    loadCompleteInsuranceCreatedAtCohort
} from "./complete-created-at-cohort";

import type {
    InsuranceCreatedAtCohortPage,
    InsuranceCreatedAtCohortPageReader,
    InsuranceCreatedAtCohortRelationship
} from "./complete-created-at-cohort";


export const INSURANCE_CREATED_AT_REPORT_COHORT_VERSION =
    "insurance-created-at-report-cohort-v1" as const;


export type InsuranceCreatedAtReportCohortSelection =
    | "complete-range"
    | "limited";


export interface ResolveInsuranceCreatedAtReportCohortInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit?:
        number;
}


export interface InsuranceCreatedAtReportCohort {
    readonly version:
        typeof INSURANCE_CREATED_AT_REPORT_COHORT_VERSION;

    readonly selection:
        InsuranceCreatedAtReportCohortSelection;

    readonly relationships:
        readonly InsuranceCreatedAtCohortRelationship[];

    readonly relationshipCount:
        number;

    readonly pageCount:
        number;

    readonly isComplete:
        boolean;

    readonly isTruncated:
        boolean;

    readonly requestedLimit?:
        number;
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
            `Insurance created-at report cohort requires ${field} to be a canonical UTC ISO timestamp.`
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
            `Insurance created-at report cohort requires ${field} to be a canonical UTC ISO timestamp.`
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
            `Insurance created-at report cohort requires ${field} to be a canonical relationship identity.`
        );
    }

    return value;
}


function requireLimit(
    value:
        unknown
): number {
    if(
        typeof value !== "number" ||
        !Number.isInteger(
            value
        ) ||
        value < 1 ||
        value > 100
    ){
        throw new TypeError(
            "Insurance created-at report cohort limit must be an integer from 1 through 100."
        );
    }

    return value;
}


function canonicalLimitedRelationships(
    page:
        InsuranceCreatedAtCohortPage,
    input: {
        readonly createdAtFromInclusive:
            string;

        readonly createdAtToExclusive:
            string;

        readonly limit:
            number;
    }
): readonly InsuranceCreatedAtCohortRelationship[] {
    if(
        typeof page !== "object" ||
        page === null ||
        !Array.isArray(
            page.relationships
        ) ||
        typeof page.hasMore !== "boolean"
    ){
        throw new TypeError(
            "Insurance created-at report cohort page reader returned a malformed page."
        );
    }

    if(
        page.relationships.length >
        input.limit
    ){
        throw new RangeError(
            "Insurance created-at report cohort page reader returned more relationships than the requested limit."
        );
    }

    if(page.hasMore){
        if(page.relationships.length === 0){
            throw new RangeError(
                "Insurance created-at report cohort page reader cannot report hasMore for an empty limited page."
            );
        }

        if(page.nextCursor === undefined){
            throw new RangeError(
                "Insurance created-at report cohort page reader must provide nextCursor when hasMore is true."
            );
        }
    }
    else if(page.nextCursor !== undefined){
        throw new RangeError(
            "Insurance created-at report cohort page reader must omit nextCursor when hasMore is false."
        );
    }

    const relationships:
        InsuranceCreatedAtCohortRelationship[] = [];

    const seenRelationshipIds =
        new Set<string>();

    for(
        let index = 0;
        index < page.relationships.length;
        index++
    ){
        const relationship =
            page.relationships[index];

        if(
            typeof relationship !== "object" ||
            relationship === null
        ){
            throw new TypeError(
                "Insurance created-at report cohort page reader returned a malformed relationship."
            );
        }

        const relationshipId =
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
                input.createdAtFromInclusive ||
            createdAt >=
                input.createdAtToExclusive
        ){
            throw new RangeError(
                "Insurance created-at report cohort page reader returned a relationship outside the requested created-at range."
            );
        }

        if(
            seenRelationshipIds.has(
                relationshipId
            )
        ){
            continue;
        }

        seenRelationshipIds.add(
            relationshipId
        );

        relationships.push({
            relationshipId,
            createdAt
        });
    }

    if(page.hasMore){
        const nextCursor =
            page.nextCursor;

        if(
            typeof nextCursor !== "object" ||
            nextCursor === null
        ){
            throw new TypeError(
                "Insurance created-at report cohort page reader returned a malformed nextCursor."
            );
        }

        const cursorCreatedAt =
            requireCanonicalUtcTimestamp(
                nextCursor.createdAt,
                "nextCursor.createdAt"
            );

        const cursorRelationshipId =
            requireRelationshipId(
                nextCursor.relationshipId,
                "nextCursor.relationshipId"
            );

        const finalRelationship =
            page.relationships[
                page.relationships.length - 1
            ];

        if(
            finalRelationship === undefined ||
            cursorCreatedAt !==
                finalRelationship.createdAt ||
            cursorRelationshipId !==
                finalRelationship.relationshipId
        ){
            throw new RangeError(
                "Insurance created-at report cohort continuation cursor must identify the final relationship returned by the limited page."
            );
        }
    }

    return relationships;
}


export interface InsuranceCreatedAtReportCohortMetadata {
    readonly selection:
        InsuranceCreatedAtReportCohortSelection;

    readonly relationshipCount:
        number;

    readonly pageCount:
        number;

    readonly isComplete:
        boolean;

    readonly isTruncated:
        boolean;

    readonly requestedLimit?:
        number;
}


export function projectInsuranceCreatedAtReportCohortMetadata(
    cohort:
        InsuranceCreatedAtReportCohort
): InsuranceCreatedAtReportCohortMetadata {
    return {
        selection:
            cohort.selection,

        relationshipCount:
            cohort.relationshipCount,

        pageCount:
            cohort.pageCount,

        isComplete:
            cohort.isComplete,

        isTruncated:
            cohort.isTruncated,

        ...(cohort.requestedLimit !== undefined
            ? {
                requestedLimit:
                    cohort.requestedLimit
            }
            : {})
    };
}

export async function resolveInsuranceCreatedAtReportCohort(
    reader:
        InsuranceCreatedAtCohortPageReader,
    input:
        ResolveInsuranceCreatedAtReportCohortInput
): Promise<InsuranceCreatedAtReportCohort> {
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
            "Insurance created-at report cohort requires createdAtFromInclusive to be earlier than createdAtToExclusive."
        );
    }

    if(input.limit === undefined){
        const complete =
            await loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive,
                    createdAtToExclusive
                }
            );

        return {
            version:
                INSURANCE_CREATED_AT_REPORT_COHORT_VERSION,

            selection:
                "complete-range",

            relationships:
                complete.relationships,

            relationshipCount:
                complete.relationshipCount,

            pageCount:
                complete.pageCount,

            isComplete:
                true,

            isTruncated:
                false
        };
    }

    const limit =
        requireLimit(
            input.limit
        );

    const page =
        await reader
            .listCreatedAtRangePage({
                createdAtFromInclusive,
                createdAtToExclusive,

                pageSize:
                    limit
            });

    const relationships =
        canonicalLimitedRelationships(
            page,
            {
                createdAtFromInclusive,
                createdAtToExclusive,
                limit
            }
        );

    return {
        version:
            INSURANCE_CREATED_AT_REPORT_COHORT_VERSION,

        selection:
            "limited",

        relationships,

        relationshipCount:
            relationships.length,

        pageCount:
            1,

        isComplete:
            !page.hasMore,

        isTruncated:
            page.hasMore,

        requestedLimit:
            limit
    };
}
