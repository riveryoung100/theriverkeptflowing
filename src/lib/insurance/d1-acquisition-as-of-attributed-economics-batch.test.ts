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

import {
    INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION
} from "./d1-acquisition-raw-evidence-batch";

import type {
    InsuranceAcquisitionRawEvidenceBatch,
    InsuranceAcquisitionRawEvidenceBatchApplication
} from "./d1-acquisition-raw-evidence-batch";

import {
    createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication,
    INSURANCE_ACQUISITION_AS_OF_ATTRIBUTED_ECONOMICS_BATCH_VERSION
} from "./d1-acquisition-as-of-attributed-economics-batch";


const relationshipOne =
    "relationship:ins-004m-a" as RiverCrmRelationshipId;

const relationshipTwo =
    "relationship:ins-004m-b" as RiverCrmRelationshipId;


function emptyRawEvidence(
    relationshipIds:
        readonly RiverCrmRelationshipId[]
): InsuranceAcquisitionRawEvidenceBatch {
    return {
        projectionVersion:
            INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION,

        relationshipIds,

        presentations:
            [],

        acquisitionCosts:
            [],

        premiumFacts:
            [],

        commissionFacts:
            [],

        renewalFacts:
            [],

        outcomeFacts:
            []
    };
}


class RecordingRawEvidenceApplication
implements InsuranceAcquisitionRawEvidenceBatchApplication {
    calls =
        0;

    relationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    constructor(
        readonly evidence:
            InsuranceAcquisitionRawEvidenceBatch
    ){}

    async getEvidence(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            relationshipIds;

        return this.evidence;
    }
}


test(
    "loads raw evidence once and returns views in canonical raw cohort order",
    async () => {
        const rawApplication =
            new RecordingRawEvidenceApplication(
                emptyRawEvidence([
                    relationshipOne,
                    relationshipTwo
                ])
            );

        const application =
            createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
                rawApplication
            );

        const result =
            await application
                .getViewsAsOf({
                    relationshipIds: [
                        relationshipOne,
                        relationshipOne,
                        relationshipTwo
                    ],

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z"
                });

        assert.equal(
            rawApplication.calls,
            1
        );

        assert.deepEqual(
            rawApplication.relationshipIds,
            [
                relationshipOne,
                relationshipOne,
                relationshipTwo
            ]
        );

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_AS_OF_ATTRIBUTED_ECONOMICS_BATCH_VERSION
        );

        assert.equal(
            result.asOfExclusive,
            "2026-10-01T00:00:00.000Z"
        );

        assert.deepEqual(
            result.views.map(
                view =>
                    view.relationshipId
            ),
            [
                relationshipOne,
                relationshipTwo
            ]
        );
    }
);


test(
    "filters raw economics by occurredAt before canonical relationship analytics",
    async () => {
        const before =
            "2026-09-30T23:59:59.999Z";

        const boundary =
            "2026-10-01T00:00:00.000Z";

        const rawApplication =
            new RecordingRawEvidenceApplication({
                projectionVersion:
                    INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION,

                relationshipIds: [
                    relationshipOne
                ],

                presentations:
                    [],

                acquisitionCosts: [
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:ins-004m-before",
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
                        occurredAt:
                            before
                    }),
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:ins-004m-boundary",
                        relationshipId:
                            relationshipOne,
                        category:
                            "advertising",
                        money: {
                            amountMinorUnits:
                                9000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            boundary
                    })
                ],

                premiumFacts: [
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:ins-004m-before",
                        relationshipId:
                            relationshipOne,
                        kind:
                            "written",
                        money: {
                            amountMinorUnits:
                                180000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            before
                    }),
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:ins-004m-boundary",
                        relationshipId:
                            relationshipOne,
                        kind:
                            "quoted",
                        money: {
                            amountMinorUnits:
                                250000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            boundary
                    })
                ],

                commissionFacts: [
                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:ins-004m-before",
                        relationshipId:
                            relationshipOne,
                        kind:
                            "earned",
                        money: {
                            amountMinorUnits:
                                18000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            before
                    })
                ],

                renewalFacts: [
                    createInsuranceRenewalFact({
                        renewalFactId:
                            "renewal-fact:ins-004m-boundary",
                        relationshipId:
                            relationshipOne,
                        kind:
                            "due",
                        occurredAt:
                            boundary
                    })
                ],

                outcomeFacts: [
                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            "outcome-fact:ins-004m-boundary",
                        relationshipId:
                            relationshipOne,
                        kind:
                            "bound",
                        occurredAt:
                            boundary
                    })
                ]
            });

        const application =
            createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
                rawApplication
            );

        const result =
            await application
                .getViewsAsOf({
                    relationshipIds: [
                        relationshipOne
                    ],

                    asOfExclusive:
                        boundary
                });

        const analytics =
            result.views[0]
                ?.analytics;

        assert.equal(
            analytics
                ?.currencies.length,
            1
        );

        assert.equal(
            analytics
                ?.currencies[0]
                ?.acquisitionCostMinorUnits,
            1000
        );

        assert.equal(
            analytics
                ?.currencies[0]
                ?.writtenPremiumMinorUnits,
            180000
        );

        assert.equal(
            analytics
                ?.currencies[0]
                ?.quotedPremiumMinorUnits,
            0
        );

        assert.equal(
            analytics
                ?.currencies[0]
                ?.earnedCommissionMinorUnits,
            18000
        );

        assert.equal(
            analytics
                ?.renewalFactCount,
            0
        );
    }
);


test(
    "keeps current presentation metadata unfiltered",
    async () => {
        const presentation =
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
                    "bound",

                acquisitionSource:
                    "google",

                campaign:
                    "current-campaign",

                consentChannels:
                    [],

                doNotContact:
                    false,

                recentEvents:
                    []
            } as InsuranceLeadPresentation;

        const rawApplication =
            new RecordingRawEvidenceApplication({
                ...emptyRawEvidence([
                    relationshipOne
                ]),

                presentations: [
                    presentation
                ]
            });

        const application =
            createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
                rawApplication
            );

        const result =
            await application
                .getViewsAsOf({
                    relationshipIds: [
                        relationshipOne
                    ],

                    asOfExclusive:
                        "2026-01-01T00:00:00.000Z"
                });

        assert.equal(
            result.views[0]
                ?.presentation,
            presentation
        );

        assert.equal(
            result.views[0]
                ?.presentation
                ?.quoteStatus,
            "bound"
        );

        assert.equal(
            result.views[0]
                ?.presentation
                ?.campaign,
            "current-campaign"
        );
    }
);


test(
    "preserves relationships without presentation or surviving economics evidence",
    async () => {
        const rawApplication =
            new RecordingRawEvidenceApplication({
                ...emptyRawEvidence([
                    relationshipOne,
                    relationshipTwo
                ]),

                acquisitionCosts: [
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:ins-004m-after",
                        relationshipId:
                            relationshipOne,
                        category:
                            "advertising",
                        money: {
                            amountMinorUnits:
                                500,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            "2026-10-02T00:00:00.000Z"
                    })
                ]
            });

        const application =
            createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
                rawApplication
            );

        const result =
            await application
                .getViewsAsOf({
                    relationshipIds: [
                        relationshipOne,
                        relationshipTwo
                    ],

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z"
                });

        assert.equal(
            result.views.length,
            2
        );

        for(const view of result.views){
            assert.deepEqual(
                view.analytics.currencies,
                []
            );

            assert.equal(
                view.analytics.renewalFactCount,
                0
            );

            assert.equal(
                view.presentation,
                undefined
            );
        }
    }
);


test(
    "future effectiveAt does not exclude premium or renewal facts that occurred before cutoff",
    async () => {
        const rawApplication =
            new RecordingRawEvidenceApplication({
                ...emptyRawEvidence([
                    relationshipOne
                ]),

                premiumFacts: [
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:ins-004m-future-effective",
                        relationshipId:
                            relationshipOne,
                        kind:
                            "written",
                        money: {
                            amountMinorUnits:
                                210000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            "2026-09-15T00:00:00.000Z",
                        effectiveAt:
                            "2026-11-01T00:00:00.000Z"
                    })
                ],

                renewalFacts: [
                    createInsuranceRenewalFact({
                        renewalFactId:
                            "renewal-fact:ins-004m-future-effective",
                        relationshipId:
                            relationshipOne,
                        kind:
                            "due",
                        occurredAt:
                            "2026-09-20T00:00:00.000Z",
                        effectiveAt:
                            "2027-01-01T00:00:00.000Z"
                    })
                ]
            });

        const application =
            createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
                rawApplication
            );

        const result =
            await application
                .getViewsAsOf({
                    relationshipIds: [
                        relationshipOne
                    ],

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z"
                });

        const analytics =
            result.views[0]
                ?.analytics;

        assert.equal(
            analytics
                ?.currencies[0]
                ?.writtenPremiumMinorUnits,
            210000
        );

        assert.equal(
            analytics
                ?.renewalFactCount,
            1
        );

        assert.equal(
            analytics
                ?.latestRenewal
                ?.effectiveAt,
            "2027-01-01T00:00:00.000Z"
        );
    }
);


test(
    "canonical as-of validation remains owned by INS-004K",
    async () => {
        const rawApplication =
            new RecordingRawEvidenceApplication(
                emptyRawEvidence([
                    relationshipOne
                ])
            );

        const application =
            createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
                rawApplication
            );

        await assert.rejects(
            application
                .getViewsAsOf({
                    relationshipIds: [
                        relationshipOne
                    ],

                    asOfExclusive:
                        "2026-10-01T00:00:00Z"
                }),
            /canonical UTC timestamp/
        );

        assert.equal(
            rawApplication.calls,
            1
        );
    }
);
