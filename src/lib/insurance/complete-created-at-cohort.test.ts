import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_COMPLETE_CREATED_AT_COHORT_VERSION,
    loadCompleteInsuranceCreatedAtCohort
} from "./complete-created-at-cohort";

import type {
    InsuranceCreatedAtCohortPage,
    InsuranceCreatedAtCohortPageQuery,
    InsuranceCreatedAtCohortPageReader
} from "./complete-created-at-cohort";


class RecordingPageReader
implements InsuranceCreatedAtCohortPageReader {
    public readonly queries:
        InsuranceCreatedAtCohortPageQuery[] = [];

    public constructor(
        private readonly pages:
            readonly InsuranceCreatedAtCohortPage[]
    ) {}


    public async listCreatedAtRangePage(
        query:
            InsuranceCreatedAtCohortPageQuery
    ): Promise<InsuranceCreatedAtCohortPage> {
        this.queries.push(
            query
        );

        const page =
            this.pages[
                this.queries.length - 1
            ];

        if(page === undefined){
            throw new Error(
                "Recording page reader exhausted."
            );
        }

        return page;
    }
}


test(
    "loads every bounded created-at page before returning one complete ordered cohort",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:three",

                            createdAt:
                                "2026-09-30T12:00:00.000Z"
                        },
                        {
                            relationshipId:
                                "relationship:two",

                            createdAt:
                                "2026-09-20T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        true,

                    nextCursor: {
                        createdAt:
                            "2026-09-20T12:00:00.000Z",

                        relationshipId:
                            "relationship:two"
                    }
                },
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:one",

                            createdAt:
                                "2026-09-10T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        false
                }
            ]);

        const result =
            await loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
                        2
                }
            );

        assert.deepEqual(
            result,
            {
                version:
                    INSURANCE_COMPLETE_CREATED_AT_COHORT_VERSION,

                relationships: [
                    {
                        relationshipId:
                            "relationship:three",

                        createdAt:
                            "2026-09-30T12:00:00.000Z"
                    },
                    {
                        relationshipId:
                            "relationship:two",

                        createdAt:
                            "2026-09-20T12:00:00.000Z"
                    },
                    {
                        relationshipId:
                            "relationship:one",

                        createdAt:
                            "2026-09-10T12:00:00.000Z"
                    }
                ],

                relationshipCount:
                    3,

                pageCount:
                    2,

                isComplete:
                    true
            }
        );

        assert.deepEqual(
            reader.queries,
            [
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
                        2
                },
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
                        2,

                    cursor: {
                        createdAt:
                            "2026-09-20T12:00:00.000Z",

                        relationshipId:
                            "relationship:two"
                    }
                }
            ]
        );
    }
);


test(
    "uses maximum bounded page size one hundred by default",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships:
                        [],

                    hasMore:
                        false
                }
            ]);

        const result =
            await loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            );

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.equal(
            result.pageCount,
            1
        );

        assert.deepEqual(
            reader.queries,
            [
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
                        100
                }
            ]
        );
    }
);


test(
    "deduplicates relationship identity across pages while preserving first occurrence",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:two",

                            createdAt:
                                "2026-09-20T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        true,

                    nextCursor: {
                        createdAt:
                            "2026-09-20T12:00:00.000Z",

                        relationshipId:
                            "relationship:two"
                    }
                },
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:two",

                            createdAt:
                                "2026-09-20T12:00:00.000Z"
                        },
                        {
                            relationshipId:
                                "relationship:one",

                            createdAt:
                                "2026-09-10T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        false
                }
            ]);

        const result =
            await loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
                        1
                }
            );

        assert.deepEqual(
            result.relationships.map(
                relationship =>
                    relationship.relationshipId
            ),
            [
                "relationship:two",
                "relationship:one"
            ]
        );

        assert.equal(
            result.relationshipCount,
            2
        );
    }
);


test(
    "rejects hasMore without a continuation cursor",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:one",

                            createdAt:
                                "2026-09-10T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        true
                }
            ]);

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            ),
            /must provide nextCursor/
        );

        assert.equal(
            reader.queries.length,
            1
        );
    }
);


test(
    "rejects hasMore on an empty page",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships:
                        [],

                    hasMore:
                        true,

                    nextCursor: {
                        createdAt:
                            "2026-09-10T12:00:00.000Z",

                        relationshipId:
                            "relationship:one"
                    }
                }
            ]);

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            ),
            /cannot report hasMore for an empty page/
        );
    }
);


test(
    "rejects a continuation cursor that does not identify the final returned relationship",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:two",

                            createdAt:
                                "2026-09-20T12:00:00.000Z"
                        },
                        {
                            relationshipId:
                                "relationship:one",

                            createdAt:
                                "2026-09-10T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        true,

                    nextCursor: {
                        createdAt:
                            "2026-09-20T12:00:00.000Z",

                        relationshipId:
                            "relationship:two"
                    }
                }
            ]);

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            ),
            /must identify the final relationship/
        );
    }
);


test(
    "rejects a repeated continuation cursor before requesting an infinite loop",
    async () => {
        const repeatedCursor = {
            createdAt:
                "2026-09-20T12:00:00.000Z",

            relationshipId:
                "relationship:two"
        } as const;

        const reader =
            new RecordingPageReader([
                {
                    relationships: [
                        {
                            relationshipId:
                                repeatedCursor.relationshipId,

                            createdAt:
                                repeatedCursor.createdAt
                        }
                    ],

                    hasMore:
                        true,

                    nextCursor:
                        repeatedCursor
                },
                {
                    relationships: [
                        {
                            relationshipId:
                                repeatedCursor.relationshipId,

                            createdAt:
                                repeatedCursor.createdAt
                        }
                    ],

                    hasMore:
                        true,

                    nextCursor:
                        repeatedCursor
                }
            ]);

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            ),
            /repeated continuation cursor|non-advancing continuation cursor/
        );

        assert.equal(
            reader.queries.length,
            2
        );
    }
);


test(
    "rejects nextCursor when the page declares completion",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:one",

                            createdAt:
                                "2026-09-10T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        false,

                    nextCursor: {
                        createdAt:
                            "2026-09-10T12:00:00.000Z",

                        relationshipId:
                            "relationship:one"
                    }
                }
            ]);

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            ),
            /must omit nextCursor/
        );
    }
);


test(
    "rejects invalid range and page size before page-reader access",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships:
                        [],

                    hasMore:
                        false
                }
            ]);

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            ),
            /canonical UTC ISO timestamp/
        );

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-10-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-09-01T00:00:00.000Z"
                }
            ),
            /earlier than/
        );

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
                        101
                }
            ),
            /1 through 100/
        );

        assert.equal(
            reader.queries.length,
            0
        );
    }
);


test(
    "rejects relationships outside the requested created-at range",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:outside",

                            createdAt:
                                "2026-10-01T00:00:00.000Z"
                        }
                    ],

                    hasMore:
                        false
                }
            ]);

        await assert.rejects(
            loadCompleteInsuranceCreatedAtCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            ),
            /outside the requested created-at range/
        );
    }
);
