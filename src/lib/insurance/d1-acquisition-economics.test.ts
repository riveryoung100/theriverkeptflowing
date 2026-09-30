import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact,
    createInsuranceRenewalFact
} from "./acquisition-economics";

import {
    createD1InsuranceAcquisitionEconomicsPersistence
} from "./d1-acquisition-economics";

import type {
    RiverCrmD1AllResult,
    RiverCrmD1Database,
    RiverCrmD1RunResult,
    RiverCrmD1Statement
} from "../river-os/d1-crm-growth";


interface RecordedStatement {
    readonly sql:
        string;
    readonly binds:
        readonly unknown[];
}


class FakeStatement
implements RiverCrmD1Statement {
    public binds:
        unknown[] = [];

    public constructor(
        private readonly owner:
            FakeDatabase,
        public readonly sql:
            string
    ) {}

    public bind(
        ...values:
            unknown[]
    ): RiverCrmD1Statement {
        this.binds =
            values;

        this.owner.recorded.push({
            sql:
                this.sql,
            binds:
                values
        });

        return this;
    }

    public async first<
        T = Record<string, unknown>
    >(): Promise<T | null> {
        return null;
    }

    public async all<
        T = Record<string, unknown>
    >(): Promise<
        RiverCrmD1AllResult<T>
    > {
        const results =
            this.owner
                .allResultBatches
                .shift() ??
            this.owner.allResults;

        return {
            success:
                this.owner.allSuccess,
            results:
                results as
                    readonly T[]
        };
    }

    public async run():
        Promise<
            RiverCrmD1RunResult
        > {

        if(this.owner.runError !== undefined){
            throw this.owner.runError;
        }

        return this.owner.runResult;
    }
}


class FakeDatabase
implements RiverCrmD1Database {
    public readonly recorded:
        RecordedStatement[] = [];

    public allResults:
        readonly Record<string, unknown>[] =
            [];

    public readonly allResultBatches:
        Array<
            readonly Record<string, unknown>[]
        > = [];

    public queueAllResults(
        rows:
            readonly Record<string, unknown>[]
    ): void {
        this.allResultBatches.push(
            rows
        );
    }

    public allSuccess:
        boolean | undefined =
            true;

    public runResult:
        RiverCrmD1RunResult = {
            success:
                true,
            meta: {
                changes:
                    1
            }
        };

    public runError:
        Error | undefined;

    public prepare(
        sql:
            string
    ): RiverCrmD1Statement {
        return new FakeStatement(
            this,
            sql
        );
    }
}


const relationshipId =
    "relationship:ins-003d";

const occurredAt =
    "2026-09-29T23:00:00.000Z";


test(
    "migration defines four additive relationship-rooted economic fact tables",
    async () => {
        const fs =
            await import(
                "node:fs/promises"
            );

        const migration =
            await fs.readFile(
                "migrations/river-crm/0006_river_crm_insurance_acquisition_economics.sql",
                "utf8"
            );

        for(const table of [
            "river_crm_insurance_acquisition_costs",
            "river_crm_insurance_premium_facts",
            "river_crm_insurance_commission_facts",
            "river_crm_insurance_renewal_facts"
        ]){
            assert.match(
                migration,
                new RegExp(
                    `CREATE TABLE IF NOT EXISTS ${table}`
                )
            );
        }

        assert.match(
            migration,
            /FOREIGN KEY \(relationship_id\)[\s\S]*REFERENCES river_crm_relationships\(relationship_id\)[\s\S]*ON DELETE CASCADE/
        );

        assert.match(
            migration,
            /amount_minor_units INTEGER NOT NULL[\s\S]*CHECK \(amount_minor_units >= 0\)/
        );

        assert.doesNotMatch(
            migration,
            /DROP TABLE|ALTER TABLE|DELETE FROM|UPDATE river_crm/i
        );
    }
);


test(
    "inserts canonical acquisition cost with nullable values",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        const fact =
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:d1-1",
                relationshipId,
                category:
                    "lead",
                money: {
                    amountMinorUnits:
                        2500,
                    currency:
                        "USD"
                },
                occurredAt
            });

        const result =
            await persistence
                .insertAcquisitionCost(
                    fact
                );

        assert.equal(
            result.costId,
            fact.costId
        );

        assert.match(
            database.recorded[0]!.sql,
            /INSERT INTO river_crm_insurance_acquisition_costs/
        );

        assert.deepEqual(
            database.recorded[0]!.binds,
            [
                "acquisition-cost:d1-1",
                relationshipId,
                "lead",
                2500,
                "USD",
                occurredAt,
                null,
                null,
                null,
                null,
                null
            ]
        );
    }
);


test(
    "lists acquisition cost rows through canonical hydration",
    async () => {
        const database =
            new FakeDatabase();

        database.allResults = [
            {
                cost_id:
                    "acquisition-cost:row-1",
                relationship_id:
                    relationshipId,
                category:
                    "advertising",
                amount_minor_units:
                    10000,
                currency:
                    "USD",
                occurred_at:
                    occurredAt,
                source:
                    "google",
                vendor:
                    null,
                campaign:
                    "launch",
                external_reference:
                    null,
                note:
                    null
            }
        ];

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        const values =
            await persistence
                .listAcquisitionCostsForRelationship(
                    relationshipId
                );

        assert.equal(
            values.length,
            1
        );

        assert.equal(
            values[0]!.money.amountMinorUnits,
            10000
        );

        assert.equal(
            values[0]!.source,
            "google"
        );
    }
);


test(
    "inserts written premium fact",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        await persistence.insertPremiumFact(
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:d1-1",
                relationshipId,
                kind:
                    "written",
                money: {
                    amountMinorUnits:
                        180000,
                    currency:
                        "USD"
                },
                occurredAt,
                policyReference:
                    "policy-1"
            })
        );

        assert.match(
            database.recorded[0]!.sql,
            /INSERT INTO river_crm_insurance_premium_facts/
        );

        assert.equal(
            database.recorded[0]!.binds[3],
            180000
        );
    }
);


test(
    "persists signed commission chargeback",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        await persistence.insertCommissionFact(
            createInsuranceCommissionFact({
                commissionFactId:
                    "commission-fact:d1-1",
                relationshipId,
                kind:
                    "chargeback",
                money: {
                    amountMinorUnits:
                        -5000,
                    currency:
                        "USD"
                },
                occurredAt
            })
        );

        assert.match(
            database.recorded[0]!.sql,
            /INSERT INTO river_crm_insurance_commission_facts/
        );

        assert.equal(
            database.recorded[0]!.binds[3],
            -5000
        );
    }
);


test(
    "hydrates renewal fact with optional effective timestamp",
    async () => {
        const database =
            new FakeDatabase();

        database.allResults = [
            {
                renewal_fact_id:
                    "renewal-fact:d1-1",
                relationship_id:
                    relationshipId,
                kind:
                    "due",
                occurred_at:
                    occurredAt,
                provider_reference:
                    "carrier-a",
                policy_reference:
                    "policy-1",
                effective_at:
                    "2027-10-01T00:00:00.000Z",
                external_reference:
                    null,
                note:
                    null
            }
        ];

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        const values =
            await persistence
                .listRenewalFactsForRelationship(
                    relationshipId
                );

        assert.equal(
            values[0]!.kind,
            "due"
        );

        assert.equal(
            values[0]!.effectiveAt,
            "2027-10-01T00:00:00.000Z"
        );
    }
);


test(
    "rejects noncanonical relationship before list query",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        await assert.rejects(
            persistence.listPremiumFactsForRelationship(
                "lead:invalid" as
                    never
            ),
            /relationship/
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);


test(
    "write requires exactly one changed row",
    async () => {
        const database =
            new FakeDatabase();

        database.runResult = {
            success:
                true,
            meta: {
                changes:
                    0
            }
        };

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        await assert.rejects(
            persistence.insertRenewalFact(
                createInsuranceRenewalFact({
                    renewalFactId:
                        "renewal-fact:d1-zero",
                    relationshipId,
                    kind:
                        "due",
                    occurredAt
                })
            ),
            /exactly one changed row/
        );
    }
);


test(
    "D1 write failure propagates",
    async () => {
        const database =
            new FakeDatabase();

        database.runError =
            new Error(
                "d1 unavailable"
            );

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        await assert.rejects(
            persistence.insertAcquisitionCost(
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:d1-error",
                    relationshipId,
                    category:
                        "lead",
                    money: {
                        amountMinorUnits:
                            100,
                        currency:
                            "USD"
                    },
                    occurredAt
                })
            ),
            /d1 unavailable/
        );
    }
);

test(
    "batch acquisition-cost read deduplicates requested relationship IDs",
    async () => {
        const database =
            new FakeDatabase();

        const secondRelationshipId =
            "relationship:ins-003i-cost";

        database.allResults = [
            {
                cost_id:
                    "acquisition-cost:ins-003i-1",
                relationship_id:
                    relationshipId,
                category:
                    "advertising",
                amount_minor_units:
                    10000,
                currency:
                    "USD",
                occurred_at:
                    occurredAt,
                source:
                    "google",
                vendor:
                    null,
                campaign:
                    "launch",
                external_reference:
                    null,
                note:
                    null
            },
            {
                cost_id:
                    "acquisition-cost:ins-003i-2",
                relationship_id:
                    secondRelationshipId,
                category:
                    "advertising",
                amount_minor_units:
                    12000,
                currency:
                    "USD",
                occurred_at:
                    occurredAt,
                source:
                    "website",
                vendor:
                    null,
                campaign:
                    "organic",
                external_reference:
                    null,
                note:
                    null
            }
        ];

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        const values =
            await persistence
                .listAcquisitionCostsForRelationships([
                    relationshipId,
                    relationshipId,
                    secondRelationshipId
                ]);

        assert.equal(
            database.recorded.length,
            1
        );

        assert.deepEqual(
            database.recorded[0]!.binds,
            [
                relationshipId,
                secondRelationshipId
            ]
        );

        assert.match(
            database.recorded[0]!.sql,
            /WHERE relationship_id IN \(\?, \?\)/
        );

        assert.match(
            database.recorded[0]!.sql,
            /relationship_id ASC/
        );

        assert.equal(
            values.length,
            2
        );

        assert.equal(
            values[0]!.money.amountMinorUnits,
            10000
        );

        assert.equal(
            values[1]!.relationshipId,
            secondRelationshipId
        );
    }
);


test(
    "batch premium read uses one bounded query and canonical hydration",
    async () => {
        const database =
            new FakeDatabase();

        const secondRelationshipId =
            "relationship:ins-003i-premium";

        database.allResults = [
            {
                premium_fact_id:
                    "premium-fact:ins-003i-1",
                relationship_id:
                    relationshipId,
                kind:
                    "written",
                amount_minor_units:
                    220000,
                currency:
                    "USD",
                occurred_at:
                    occurredAt,
                provider_reference:
                    null,
                policy_reference:
                    "policy-1",
                effective_at:
                    null,
                external_reference:
                    null
            },
            {
                premium_fact_id:
                    "premium-fact:ins-003i-2",
                relationship_id:
                    secondRelationshipId,
                kind:
                    "quoted",
                amount_minor_units:
                    180000,
                currency:
                    "USD",
                occurred_at:
                    occurredAt,
                provider_reference:
                    null,
                policy_reference:
                    null,
                effective_at:
                    null,
                external_reference:
                    null
            }
        ];

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        const values =
            await persistence
                .listPremiumFactsForRelationships([
                    relationshipId,
                    secondRelationshipId
                ]);

        assert.equal(
            database.recorded.length,
            1
        );

        assert.deepEqual(
            database.recorded[0]!.binds,
            [
                relationshipId,
                secondRelationshipId
            ]
        );

        assert.match(
            database.recorded[0]!.sql,
            /FROM river_crm_insurance_premium_facts/
        );

        assert.match(
            database.recorded[0]!.sql,
            /WHERE relationship_id IN \(\?, \?\)/
        );

        assert.equal(
            values.length,
            2
        );

        assert.equal(
            values[0]!.kind,
            "written"
        );

        assert.equal(
            values[1]!.money.amountMinorUnits,
            180000
        );
    }
);


test(
    "batch commission read directly covers signed commission hydration",
    async () => {
        const database =
            new FakeDatabase();

        const secondRelationshipId =
            "relationship:ins-003i-commission";

        database.allResults = [
            {
                commission_fact_id:
                    "commission-fact:ins-003i-1",
                relationship_id:
                    relationshipId,
                kind:
                    "paid",
                amount_minor_units:
                    16000,
                currency:
                    "USD",
                occurred_at:
                    occurredAt,
                provider_reference:
                    null,
                policy_reference:
                    "policy-1",
                external_reference:
                    null,
                note:
                    null
            },
            {
                commission_fact_id:
                    "commission-fact:ins-003i-2",
                relationship_id:
                    secondRelationshipId,
                kind:
                    "chargeback",
                amount_minor_units:
                    -4000,
                currency:
                    "USD",
                occurred_at:
                    occurredAt,
                provider_reference:
                    null,
                policy_reference:
                    "policy-2",
                external_reference:
                    null,
                note:
                    null
            }
        ];

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        const values =
            await persistence
                .listCommissionFactsForRelationships([
                    relationshipId,
                    secondRelationshipId
                ]);

        assert.equal(
            database.recorded.length,
            1
        );

        assert.deepEqual(
            database.recorded[0]!.binds,
            [
                relationshipId,
                secondRelationshipId
            ]
        );

        assert.match(
            database.recorded[0]!.sql,
            /FROM river_crm_insurance_commission_facts/
        );

        assert.match(
            database.recorded[0]!.sql,
            /WHERE relationship_id IN \(\?, \?\)/
        );

        assert.equal(
            values.length,
            2
        );

        assert.equal(
            values[1]!.kind,
            "chargeback"
        );

        assert.equal(
            values[1]!.money.amountMinorUnits,
            -4000
        );
    }
);


test(
    "batch renewal read uses one bounded query and canonical hydration",
    async () => {
        const database =
            new FakeDatabase();

        const secondRelationshipId =
            "relationship:ins-003i-renewal";

        database.allResults = [
            {
                renewal_fact_id:
                    "renewal-fact:ins-003i-1",
                relationship_id:
                    relationshipId,
                kind:
                    "due",
                occurred_at:
                    occurredAt,
                provider_reference:
                    null,
                policy_reference:
                    "policy-1",
                effective_at:
                    "2027-10-01T00:00:00.000Z",
                external_reference:
                    null,
                note:
                    null
            },
            {
                renewal_fact_id:
                    "renewal-fact:ins-003i-2",
                relationship_id:
                    secondRelationshipId,
                kind:
                    "due",
                occurred_at:
                    occurredAt,
                provider_reference:
                    null,
                policy_reference:
                    "policy-2",
                effective_at:
                    "2027-11-01T00:00:00.000Z",
                external_reference:
                    null,
                note:
                    null
            }
        ];

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        const values =
            await persistence
                .listRenewalFactsForRelationships([
                    relationshipId,
                    secondRelationshipId
                ]);

        assert.equal(
            database.recorded.length,
            1
        );

        assert.deepEqual(
            database.recorded[0]!.binds,
            [
                relationshipId,
                secondRelationshipId
            ]
        );

        assert.match(
            database.recorded[0]!.sql,
            /FROM river_crm_insurance_renewal_facts/
        );

        assert.match(
            database.recorded[0]!.sql,
            /WHERE relationship_id IN \(\?, \?\)/
        );

        assert.equal(
            values.length,
            2
        );

        assert.equal(
            values[0]!.kind,
            "due"
        );

        assert.equal(
            values[1]!.effectiveAt,
            "2027-11-01T00:00:00.000Z"
        );
    }
);


test(
    "empty economic batch reads perform zero database queries",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        const values =
            await Promise.all([
                persistence
                    .listAcquisitionCostsForRelationships([]),
                persistence
                    .listPremiumFactsForRelationships([]),
                persistence
                    .listCommissionFactsForRelationships([]),
                persistence
                    .listRenewalFactsForRelationships([])
            ]);

        assert.deepEqual(
            values,
            [
                [],
                [],
                [],
                []
            ]
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);


test(
    "economic batch reads reject a noncanonical requested relationship before querying",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionEconomicsPersistence(
                database
            );

        await assert.rejects(
            persistence
                .listCommissionFactsForRelationships([
                    relationshipId,
                    "lead:invalid" as never
                ]),
            /relationship/
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);

test(
    "economic batch readers partition one hundred plus one relationships into bounded D1 queries",
    async () => {
        type Persistence =
            ReturnType<
                typeof createD1InsuranceAcquisitionEconomicsPersistence
            >;

        const relationshipIds =
            Array.from(
                {
                    length:
                        101
                },
                (
                    _,
                    index
                ) =>
                    `relationship:ins-005e-${String(
                        100 - index
                    ).padStart(
                        3,
                        "0"
                    )}`
            ) as unknown as
                Parameters<
                    Persistence[
                        "listAcquisitionCostsForRelationships"
                    ]
                >[0];

        const firstRelationship =
            relationshipIds[0]!;

        const finalRelationship =
            relationshipIds[100]!;

        {
            const database =
                new FakeDatabase();

            database.queueAllResults([
                {
                    cost_id:
                        "acquisition-cost:ins-005e-high",
                    relationship_id:
                        firstRelationship,
                    category:
                        "advertising",
                    amount_minor_units:
                        100,
                    currency:
                        "USD",
                    occurred_at:
                        "2026-09-30T02:00:00.000Z",
                    source:
                        null,
                    vendor:
                        null,
                    campaign:
                        null,
                    external_reference:
                        null,
                    note:
                        null
                }
            ]);

            database.queueAllResults([
                {
                    cost_id:
                        "acquisition-cost:ins-005e-low",
                    relationship_id:
                        finalRelationship,
                    category:
                        "advertising",
                    amount_minor_units:
                        200,
                    currency:
                        "USD",
                    occurred_at:
                        "2026-09-30T01:00:00.000Z",
                    source:
                        null,
                    vendor:
                        null,
                    campaign:
                        null,
                    external_reference:
                        null,
                    note:
                        null
                }
            ]);

            const values =
                await createD1InsuranceAcquisitionEconomicsPersistence(
                    database
                ).listAcquisitionCostsForRelationships(
                    relationshipIds
                );

            assert.equal(
                database.recorded.length,
                2
            );

            assert.equal(
                database.recorded[0]!
                    .binds.length,
                100
            );

            assert.equal(
                database.recorded[1]!
                    .binds.length,
                1
            );

            assert.deepEqual(
                values.map(
                    value =>
                        value.relationshipId
                ),
                [
                    finalRelationship,
                    firstRelationship
                ]
            );
        }

        const verifyTwoChunks =
            async (
                read:
                    (
                        persistence:
                            Persistence
                    ) => Promise<
                        readonly unknown[]
                    >
            ): Promise<void> => {
                const database =
                    new FakeDatabase();

                const persistence =
                    createD1InsuranceAcquisitionEconomicsPersistence(
                        database
                    );

                const values =
                    await read(
                        persistence
                    );

                assert.deepEqual(
                    values,
                    []
                );

                assert.equal(
                    database.recorded.length,
                    2
                );

                assert.equal(
                    database.recorded[0]!
                        .binds.length,
                    100
                );

                assert.equal(
                    database.recorded[1]!
                        .binds.length,
                    1
                );
            };

        await verifyTwoChunks(
            persistence =>
                persistence
                    .listPremiumFactsForRelationships(
                        relationshipIds
                    )
        );

        await verifyTwoChunks(
            persistence =>
                persistence
                    .listCommissionFactsForRelationships(
                        relationshipIds
                    )
        );

        await verifyTwoChunks(
            persistence =>
                persistence
                    .listRenewalFactsForRelationships(
                        relationshipIds
                    )
        );
    }
);
