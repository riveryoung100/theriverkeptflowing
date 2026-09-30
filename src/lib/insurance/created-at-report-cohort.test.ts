import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_CREATED_AT_REPORT_COHORT_VERSION,
    resolveInsuranceCreatedAtReportCohort
} from "./created-at-report-cohort";

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
    "omitted limit resolves the complete requested range through bounded pages",
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
            await resolveInsuranceCreatedAtReportCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            );

        assert.deepEqual(
            result,
            {
                version:
                    INSURANCE_CREATED_AT_REPORT_COHORT_VERSION,

                selection:
                    "complete-range",

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
                    true,

                isTruncated:
                    false
            }
        );

        assert.equal(
            reader.queries.length,
            2
        );

        assert.equal(
            reader.queries[0]?.pageSize,
            100
        );
    }
);


test(
    "explicit limit remains a one-page intentional cohort cap and exposes truncation",
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
                }
            ]);

        const result =
            await resolveInsuranceCreatedAtReportCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        2
                }
            );

        assert.deepEqual(
            result,
            {
                version:
                    INSURANCE_CREATED_AT_REPORT_COHORT_VERSION,

                selection:
                    "limited",

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

                relationshipCount:
                    2,

                pageCount:
                    1,

                isComplete:
                    false,

                isTruncated:
                    true,

                requestedLimit:
                    2
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
                }
            ]
        );
    }
);


test(
    "explicit limit reports complete when the requested range fits inside the cap",
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
                        false
                }
            ]);

        const result =
            await resolveInsuranceCreatedAtReportCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        5
                }
            );

        assert.equal(
            result.selection,
            "limited"
        );

        assert.equal(
            result.requestedLimit,
            5
        );

        assert.equal(
            result.relationshipCount,
            1
        );

        assert.equal(
            result.isComplete,
            true
        );

        assert.equal(
            result.isTruncated,
            false
        );

        assert.equal(
            result.pageCount,
            1
        );
    }
);


test(
    "explicit limit never follows continuation even when additional relationships exist",
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
                        true,

                    nextCursor: {
                        createdAt:
                            "2026-09-10T12:00:00.000Z",

                        relationshipId:
                            "relationship:one"
                    }
                },
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:should-not-load",

                            createdAt:
                                "2026-09-05T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        false
                }
            ]);

        const result =
            await resolveInsuranceCreatedAtReportCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        1
                }
            );

        assert.equal(
            result.relationshipCount,
            1
        );

        assert.equal(
            result.isTruncated,
            true
        );

        assert.equal(
            reader.queries.length,
            1
        );
    }
);


test(
    "limited resolution deduplicates identity while preserving first occurrence",
    async () => {
        const reader =
            new RecordingPageReader([
                {
                    relationships: [
                        {
                            relationshipId:
                                "relationship:duplicate",

                            createdAt:
                                "2026-09-20T12:00:00.000Z"
                        },
                        {
                            relationshipId:
                                "relationship:duplicate",

                            createdAt:
                                "2026-09-20T12:00:00.000Z"
                        }
                    ],

                    hasMore:
                        false
                }
            ]);

        const result =
            await resolveInsuranceCreatedAtReportCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        2
                }
            );

        assert.deepEqual(
            result.relationships,
            [
                {
                    relationshipId:
                        "relationship:duplicate",

                    createdAt:
                        "2026-09-20T12:00:00.000Z"
                }
            ]
        );

        assert.equal(
            result.relationshipCount,
            1
        );
    }
);


test(
    "rejects invalid explicit limits before page-reader access",
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

        for(const limit of [
            0,
            101,
            1.5
        ]){
            await assert.rejects(
                resolveInsuranceCreatedAtReportCohort(
                    reader,
                    {
                        createdAtFromInclusive:
                            "2026-09-01T00:00:00.000Z",

                        createdAtToExclusive:
                            "2026-10-01T00:00:00.000Z",

                        limit
                    }
                ),
                /1 through 100/
            );
        }

        assert.equal(
            reader.queries.length,
            0
        );
    }
);


test(
    "rejects malformed limited continuation metadata",
    async () => {
        const missingCursorReader =
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
            resolveInsuranceCreatedAtReportCohort(
                missingCursorReader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        1
                }
            ),
            /must provide nextCursor/
        );

        const staleCursorReader =
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
                        true,

                    nextCursor: {
                        createdAt:
                            "2026-09-09T12:00:00.000Z",

                        relationshipId:
                            "relationship:other"
                    }
                }
            ]);

        await assert.rejects(
            resolveInsuranceCreatedAtReportCohort(
                staleCursorReader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        1
                }
            ),
            /must identify the final relationship/
        );
    }
);


test(
    "rejects oversized limited page before producing report cohort metadata",
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
                        false
                }
            ]);

        await assert.rejects(
            resolveInsuranceCreatedAtReportCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        1
                }
            ),
            /more relationships than the requested limit/
        );
    }
);


test(
    "rejects invalid range before any page-reader access",
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
            resolveInsuranceCreatedAtReportCohort(
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
            resolveInsuranceCreatedAtReportCohort(
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

        assert.equal(
            reader.queries.length,
            0
        );
    }
);


test(
    "rejects limited relationships outside the requested range",
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
            resolveInsuranceCreatedAtReportCohort(
                reader,
                {
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        1
                }
            ),
            /outside the requested created-at range/
        );
    }
);
