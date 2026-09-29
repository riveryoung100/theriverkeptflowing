import assert from "node:assert/strict";
import test from "node:test";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import {
    createInsuranceAcquisitionCostFact
} from "./acquisition-economics";

import type {
    InsuranceAcquisitionCostFact,
    InsuranceCommissionFact,
    InsurancePremiumFact,
    InsuranceRenewalFact
} from "./acquisition-economics";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import {
    createInsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import type {
    InsuranceAttributedEconomicsBatchFactReader,
    InsuranceAttributedEconomicsBatchPresentationReader
} from "./d1-attributed-economics-batch";


const relationshipOne =
    requireRiverCrmRelationshipId(
        "relationship:ins-003l-1"
    );

const relationshipTwo =
    requireRiverCrmRelationshipId(
        "relationship:ins-003l-2"
    );

const occurredAt =
    "2026-09-29T20:00:00.000Z";


class RecordingPresentationReader
implements InsuranceAttributedEconomicsBatchPresentationReader {
    calls =
        0;

    requested:
        readonly string[] = [];

    constructor(
        private readonly values:
            readonly InsuranceLeadPresentation[]
    ){}

    async listForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAttributedEconomicsBatchPresentationReader[
                    "listForRelationships"
                ]
            >[0]
    ): Promise<
        readonly InsuranceLeadPresentation[]
    > {
        this.calls +=
            1;

        this.requested =
            [
                ...relationshipIds
            ];

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

    requested:
        readonly string[] = [];

    constructor(
        private readonly acquisitionCosts:
            readonly InsuranceAcquisitionCostFact[] = [],
        private readonly premiumFacts:
            readonly InsurancePremiumFact[] = [],
        private readonly commissionFacts:
            readonly InsuranceCommissionFact[] = [],
        private readonly renewalFacts:
            readonly InsuranceRenewalFact[] = []
    ){}

    private record(
        values:
            readonly string[]
    ): void {
        this.requested =
            [
                ...values
            ];
    }

    async listAcquisitionCostsForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAttributedEconomicsBatchFactReader[
                    "listAcquisitionCostsForRelationships"
                ]
            >[0]
    ){
        this.acquisitionCostCalls +=
            1;

        this.record(
            relationshipIds
        );

        return this.acquisitionCosts;
    }

    async listPremiumFactsForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAttributedEconomicsBatchFactReader[
                    "listPremiumFactsForRelationships"
                ]
            >[0]
    ){
        this.premiumCalls +=
            1;

        this.record(
            relationshipIds
        );

        return this.premiumFacts;
    }

    async listCommissionFactsForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAttributedEconomicsBatchFactReader[
                    "listCommissionFactsForRelationships"
                ]
            >[0]
    ){
        this.commissionCalls +=
            1;

        this.record(
            relationshipIds
        );

        return this.commissionFacts;
    }

    async listRenewalFactsForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAttributedEconomicsBatchFactReader[
                    "listRenewalFactsForRelationships"
                ]
            >[0]
    ){
        this.renewalCalls +=
            1;

        this.record(
            relationshipIds
        );

        return this.renewalFacts;
    }
}


test(
    "loads a deduplicated cohort once and preserves requested view order",
    async () => {
        const presentationReader =
            new RecordingPresentationReader([
                {
                    relationshipId:
                        relationshipTwo,
                    acquisitionSource:
                        "referral"
                } as InsuranceLeadPresentation,
                {
                    relationshipId:
                        relationshipOne,
                    acquisitionSource:
                        "google"
                } as InsuranceLeadPresentation
            ]);

        const factReader =
            new RecordingFactReader([
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-003l-1",
                    relationshipId:
                        relationshipOne,
                    category:
                        "advertising",
                    money: {
                        amountMinorUnits:
                            1200,
                        currency:
                            "USD"
                    },
                    occurredAt
                }),
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-003l-2",
                    relationshipId:
                        relationshipTwo,
                    category:
                        "advertising",
                    money: {
                        amountMinorUnits:
                            800,
                        currency:
                            "USD"
                    },
                    occurredAt
                })
            ]);

        const application =
            createInsuranceAttributedEconomicsBatchApplication(
                presentationReader,
                factReader
            );

        const views =
            await application
                .getViews([
                    relationshipOne,
                    relationshipTwo,
                    relationshipOne
                ]);

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

        assert.deepEqual(
            presentationReader.requested,
            [
                relationshipOne,
                relationshipTwo
            ]
        );

        assert.deepEqual(
            factReader.requested,
            [
                relationshipOne,
                relationshipTwo
            ]
        );

        assert.deepEqual(
            views.map(
                view=>
                    view.relationshipId
            ),
            [
                relationshipOne,
                relationshipTwo
            ]
        );

        assert.equal(
            views[0]
                ?.presentation
                ?.acquisitionSource,
            "google"
        );

        assert.equal(
            views[1]
                ?.presentation
                ?.acquisitionSource,
            "referral"
        );

        assert.equal(
            views[0]
                ?.analytics
                .currencies[0]
                ?.acquisitionCostMinorUnits,
            1200
        );

        assert.equal(
            views[1]
                ?.analytics
                .currencies[0]
                ?.acquisitionCostMinorUnits,
            800
        );
    }
);


test(
    "empty cohort performs zero persistence reads",
    async () => {
        const presentationReader =
            new RecordingPresentationReader(
                []
            );

        const factReader =
            new RecordingFactReader();

        const application =
            createInsuranceAttributedEconomicsBatchApplication(
                presentationReader,
                factReader
            );

        const views =
            await application
                .getViews(
                    []
                );

        assert.deepEqual(
            views,
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
    }
);


test(
    "preserves requested relationship with absent presentation and empty economics",
    async () => {
        const presentationReader =
            new RecordingPresentationReader(
                []
            );

        const factReader =
            new RecordingFactReader();

        const application =
            createInsuranceAttributedEconomicsBatchApplication(
                presentationReader,
                factReader
            );

        const views =
            await application
                .getViews([
                    relationshipOne
                ]);

        assert.equal(
            views.length,
            1
        );

        assert.equal(
            views[0]
                ?.relationshipId,
            relationshipOne
        );

        assert.equal(
            views[0]
                ?.presentation,
            undefined
        );

        assert.deepEqual(
            views[0]
                ?.analytics
                .currencies,
            []
        );
    }
);


test(
    "rejects a presentation outside the requested cohort",
    async () => {
        const presentationReader =
            new RecordingPresentationReader([
                {
                    relationshipId:
                        relationshipTwo,
                    acquisitionSource:
                        "referral"
                } as InsuranceLeadPresentation
            ]);

        const factReader =
            new RecordingFactReader();

        const application =
            createInsuranceAttributedEconomicsBatchApplication(
                presentationReader,
                factReader
            );

        await assert.rejects(
            application
                .getViews([
                    relationshipOne
                ]),
            /outside the requested cohort/
        );
    }
);


test(
    "rejects duplicate presentations for one relationship",
    async () => {
        const presentationReader =
            new RecordingPresentationReader([
                {
                    relationshipId:
                        relationshipOne
                } as InsuranceLeadPresentation,
                {
                    relationshipId:
                        relationshipOne
                } as InsuranceLeadPresentation
            ]);

        const factReader =
            new RecordingFactReader();

        const application =
            createInsuranceAttributedEconomicsBatchApplication(
                presentationReader,
                factReader
            );

        await assert.rejects(
            application
                .getViews([
                    relationshipOne
                ]),
            /at most one presentation/
        );
    }
);


test(
    "rejects economic facts outside the requested cohort",
    async () => {
        const presentationReader =
            new RecordingPresentationReader(
                []
            );

        const factReader =
            new RecordingFactReader([
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-003l-outside",
                    relationshipId:
                        relationshipTwo,
                    category:
                        "advertising",
                    money: {
                        amountMinorUnits:
                            500,
                        currency:
                            "USD"
                    },
                    occurredAt
                })
            ]);

        const application =
            createInsuranceAttributedEconomicsBatchApplication(
                presentationReader,
                factReader
            );

        await assert.rejects(
            application
                .getViews([
                    relationshipOne
                ]),
            /outside the requested cohort/
        );
    }
);


test(
    "rejects invalid requested relationship before any persistence read",
    async () => {
        const presentationReader =
            new RecordingPresentationReader(
                []
            );

        const factReader =
            new RecordingFactReader();

        const application =
            createInsuranceAttributedEconomicsBatchApplication(
                presentationReader,
                factReader
            );

        await assert.rejects(
            application
                .getViews([
                    relationshipOne,
                    "lead:invalid" as never
                ]),
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
    }
);
