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
        return {
            success:
                this.owner.allSuccess,
            results:
                this.owner.allResults as
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
