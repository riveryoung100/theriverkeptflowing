import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact,
    createInsuranceRenewalFact
} from "./acquisition-economics";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import type {
    InsuranceAttributedEconomicsBatchFactReader,
    InsuranceAttributedEconomicsBatchPresentationReader
} from "./d1-attributed-economics-batch";

import {
    createInsuranceAcquisitionRawEvidenceBatchApplication,
    INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION
} from "./d1-acquisition-raw-evidence-batch";

import type {
    InsuranceAcquisitionRawEvidenceOutcomeReader
} from "./d1-acquisition-raw-evidence-batch";


const relationshipOne =
    "relationship:ins-004l-a" as RiverCrmRelationshipId;

const relationshipTwo =
    "relationship:ins-004l-b" as RiverCrmRelationshipId;

const outsideRelationship =
    "relationship:ins-004l-outside" as RiverCrmRelationshipId;

const occurredAt =
    "2026-09-15T12:00:00.000Z";


class RecordingPresentationReader
implements InsuranceAttributedEconomicsBatchPresentationReader {
    calls =
        0;

    relationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    constructor(
        readonly values:
            readonly InsuranceLeadPresentation[] =
                []
    ){}

    async listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            relationshipIds;

        return this.values;
    }
}


class RecordingFactReader
implements InsuranceAttributedEconomicsBatchFactReader {
    acquisitionCostCalls =
        0;

    premiumCalls =
        0;

    commissionCalls =
        0;

    renewalCalls =
        0;

    acquisitionCostRelationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    premiumRelationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    commissionRelationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    renewalRelationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    constructor(
        readonly acquisitionCosts:
            readonly ReturnType<
                typeof createInsuranceAcquisitionCostFact
            >[] =
                [],

        readonly premiumFacts:
            readonly ReturnType<
                typeof createInsurancePremiumFact
            >[] =
                [],

        readonly commissionFacts:
            readonly ReturnType<
                typeof createInsuranceCommissionFact
            >[] =
                [],

        readonly renewalFacts:
            readonly ReturnType<
                typeof createInsuranceRenewalFact
            >[] =
                []
    ){}

    async listAcquisitionCostsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ){
        this.acquisitionCostCalls +=
            1;

        this.acquisitionCostRelationshipIds =
            relationshipIds;

        return this.acquisitionCosts;
    }

    async listPremiumFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ){
        this.premiumCalls +=
            1;

        this.premiumRelationshipIds =
            relationshipIds;

        return this.premiumFacts;
    }

    async listCommissionFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ){
        this.commissionCalls +=
            1;

        this.commissionRelationshipIds =
            relationshipIds;

        return this.commissionFacts;
    }

    async listRenewalFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ){
        this.renewalCalls +=
            1;

        this.renewalRelationshipIds =
            relationshipIds;

        return this.renewalFacts;
    }
}


class RecordingOutcomeReader
implements InsuranceAcquisitionRawEvidenceOutcomeReader {
    calls =
        0;

    relationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    constructor(
        readonly values:
            readonly ReturnType<
                typeof createInsuranceAcquisitionOutcomeFact
            >[] =
                []
    ){}

    async listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            relationshipIds;

        return this.values;
    }
}


test(
    "canonicalizes one cohort and loads all six raw evidence families exactly once",
    async () => {
        const presentations = [
            {
                relationshipId:
                    relationshipTwo,
                state:
                    "NM",
                postalCode:
                    "88220",
                productInterest:
                    "home",
                quoteStatus:
                    "not-started",
                consentChannels:
                    [],
                doNotContact:
                    false,
                recentEvents:
                    []
            } as InsuranceLeadPresentation,
            {
                relationshipId:
                    relationshipOne,
                state:
                    "TX",
                postalCode:
                    "79720",
                productInterest:
                    "auto",
                quoteStatus:
                    "quoted",
                consentChannels:
                    [],
                doNotContact:
                    false,
                recentEvents:
                    []
            } as InsuranceLeadPresentation
        ];

        const acquisitionCosts = [
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:ins-004l-a",
                relationshipId:
                    relationshipOne,
                category:
                    "advertising",
                money: {
                    amountMinorUnits:
                        1000,
                    currency:
                        "USD"
                },
                occurredAt
            })
        ];

        const premiumFacts = [
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:ins-004l-a",
                relationshipId:
                    relationshipOne,
                kind:
                    "quoted",
                money: {
                    amountMinorUnits:
                        150000,
                    currency:
                        "USD"
                },
                occurredAt
            })
        ];

        const commissionFacts = [
            createInsuranceCommissionFact({
                commissionFactId:
                    "commission-fact:ins-004l-a",
                relationshipId:
                    relationshipOne,
                kind:
                    "earned",
                money: {
                    amountMinorUnits:
                        15000,
                    currency:
                        "USD"
                },
                occurredAt
            })
        ];

        const renewalFacts = [
            createInsuranceRenewalFact({
                renewalFactId:
                    "renewal-fact:ins-004l-a",
                relationshipId:
                    relationshipOne,
                kind:
                    "due",
                occurredAt
            })
        ];

        const outcomeFacts = [
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:ins-004l-a",
                relationshipId:
                    relationshipOne,
                kind:
                    "quoted",
                occurredAt
            })
        ];

        const presentationReader =
            new RecordingPresentationReader(
                presentations
            );

        const factReader =
            new RecordingFactReader(
                acquisitionCosts,
                premiumFacts,
                commissionFacts,
                renewalFacts
            );

        const outcomeReader =
            new RecordingOutcomeReader(
                outcomeFacts
            );

        const application =
            createInsuranceAcquisitionRawEvidenceBatchApplication(
                presentationReader,
                factReader,
                outcomeReader
            );

        const result =
            await application
                .getEvidence([
                    relationshipOne,
                    relationshipOne,
                    relationshipTwo
                ]);

        const expectedRelationshipIds = [
            relationshipOne,
            relationshipTwo
        ];

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION
        );

        assert.deepEqual(
            result.relationshipIds,
            expectedRelationshipIds
        );

        assert.deepEqual(
            presentationReader.relationshipIds,
            expectedRelationshipIds
        );

        assert.deepEqual(
            factReader.acquisitionCostRelationshipIds,
            expectedRelationshipIds
        );

        assert.deepEqual(
            factReader.premiumRelationshipIds,
            expectedRelationshipIds
        );

        assert.deepEqual(
            factReader.commissionRelationshipIds,
            expectedRelationshipIds
        );

        assert.deepEqual(
            factReader.renewalRelationshipIds,
            expectedRelationshipIds
        );

        assert.deepEqual(
            outcomeReader.relationshipIds,
            expectedRelationshipIds
        );

        assert.equal(
            presentationReader.calls,
            1
        );

        assert.equal(
            factReader.acquisitionCostCalls,
            1
        );

        assert.equal(
            factReader.premiumCalls,
            1
        );

        assert.equal(
            factReader.commissionCalls,
            1
        );

        assert.equal(
            factReader.renewalCalls,
            1
        );

        assert.equal(
            outcomeReader.calls,
            1
        );

        assert.equal(
            result.presentations,
            presentations
        );

        assert.equal(
            result.acquisitionCosts,
            acquisitionCosts
        );

        assert.equal(
            result.premiumFacts,
            premiumFacts
        );

        assert.equal(
            result.commissionFacts,
            commissionFacts
        );

        assert.equal(
            result.renewalFacts,
            renewalFacts
        );

        assert.equal(
            result.outcomeFacts,
            outcomeFacts
        );
    }
);


test(
    "empty cohort performs zero downstream reads",
    async () => {
        const presentationReader =
            new RecordingPresentationReader();

        const factReader =
            new RecordingFactReader();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionRawEvidenceBatchApplication(
                presentationReader,
                factReader,
                outcomeReader
            );

        const result =
            await application
                .getEvidence(
                    []
                );

        assert.deepEqual(
            result.relationshipIds,
            []
        );

        assert.deepEqual(
            result.presentations,
            []
        );

        assert.deepEqual(
            result.acquisitionCosts,
            []
        );

        assert.deepEqual(
            result.premiumFacts,
            []
        );

        assert.deepEqual(
            result.commissionFacts,
            []
        );

        assert.deepEqual(
            result.renewalFacts,
            []
        );

        assert.deepEqual(
            result.outcomeFacts,
            []
        );

        assert.equal(
            presentationReader.calls,
            0
        );

        assert.equal(
            factReader.acquisitionCostCalls,
            0
        );

        assert.equal(
            factReader.premiumCalls,
            0
        );

        assert.equal(
            factReader.commissionCalls,
            0
        );

        assert.equal(
            factReader.renewalCalls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );
    }
);


test(
    "malformed requested relationship fails before all reads",
    async () => {
        const presentationReader =
            new RecordingPresentationReader();

        const factReader =
            new RecordingFactReader();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionRawEvidenceBatchApplication(
                presentationReader,
                factReader,
                outcomeReader
            );

        await assert.rejects(
            application
                .getEvidence([
                    "lead:not-a-relationship"
                ] as never),
            /relationship/
        );

        assert.equal(
            presentationReader.calls,
            0
        );

        assert.equal(
            factReader.acquisitionCostCalls,
            0
        );

        assert.equal(
            factReader.premiumCalls,
            0
        );

        assert.equal(
            factReader.commissionCalls,
            0
        );

        assert.equal(
            factReader.renewalCalls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );
    }
);


test(
    "rejects presentation outside requested cohort",
    async () => {
        const presentationReader =
            new RecordingPresentationReader([
                {
                    relationshipId:
                        outsideRelationship
                } as InsuranceLeadPresentation
            ]);

        const application =
            createInsuranceAcquisitionRawEvidenceBatchApplication(
                presentationReader,
                new RecordingFactReader(),
                new RecordingOutcomeReader()
            );

        await assert.rejects(
            application
                .getEvidence([
                    relationshipOne
                ]),
            /outside the requested cohort/
        );
    }
);


test(
    "rejects duplicate presentation relationship identity",
    async () => {
        const presentation =
            {
                relationshipId:
                    relationshipOne
            } as InsuranceLeadPresentation;

        const application =
            createInsuranceAcquisitionRawEvidenceBatchApplication(
                new RecordingPresentationReader([
                    presentation,
                    presentation
                ]),
                new RecordingFactReader(),
                new RecordingOutcomeReader()
            );

        await assert.rejects(
            application
                .getEvidence([
                    relationshipOne
                ]),
            /duplicate presentation/
        );
    }
);


test(
    "rejects each raw fact family outside requested cohort",
    async () => {
        const cases = [
            new RecordingFactReader(
                [
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:outside",
                        relationshipId:
                            outsideRelationship,
                        category:
                            "advertising",
                        money: {
                            amountMinorUnits:
                                100,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ]
            ),

            new RecordingFactReader(
                [],
                [
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:outside",
                        relationshipId:
                            outsideRelationship,
                        kind:
                            "quoted",
                        money: {
                            amountMinorUnits:
                                100000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ]
            ),

            new RecordingFactReader(
                [],
                [],
                [
                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:outside",
                        relationshipId:
                            outsideRelationship,
                        kind:
                            "earned",
                        money: {
                            amountMinorUnits:
                                10000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ]
            ),

            new RecordingFactReader(
                [],
                [],
                [],
                [
                    createInsuranceRenewalFact({
                        renewalFactId:
                            "renewal-fact:outside",
                        relationshipId:
                            outsideRelationship,
                        kind:
                            "due",
                        occurredAt
                    })
                ]
            )
        ];

        for(const factReader of cases){
            const application =
                createInsuranceAcquisitionRawEvidenceBatchApplication(
                    new RecordingPresentationReader(),
                    factReader,
                    new RecordingOutcomeReader()
                );

            await assert.rejects(
                application
                    .getEvidence([
                        relationshipOne
                    ]),
                /outside the requested cohort/
            );
        }
    }
);


test(
    "rejects durable outcome fact outside requested cohort",
    async () => {
        const outcomeReader =
            new RecordingOutcomeReader([
                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:outside",
                    relationshipId:
                        outsideRelationship,
                    kind:
                        "quoted",
                    occurredAt
                })
            ]);

        const application =
            createInsuranceAcquisitionRawEvidenceBatchApplication(
                new RecordingPresentationReader(),
                new RecordingFactReader(),
                outcomeReader
            );

        await assert.rejects(
            application
                .getEvidence([
                    relationshipOne
                ]),
            /outside the requested cohort/
        );
    }
);
