import {
    createD1RiverCrmGrowthPersistence
} from "../river-os/d1-crm-growth";

import {
    createD1RiverCrmPersistence
} from "../river-os/d1-crm";

import {
    createD1InsuranceContactAttemptPersistence
} from "./d1-contact-attempt";

import {
    createInsuranceContactOrchestrationService
} from "./contact-orchestration";

import type {
    InsuranceContactOrchestrationService
} from "./contact-orchestration";

import type {
    InsuranceContactProvider
} from "./contact-attempt";


export interface InsurancePrivateContactProviderComposition {
    readonly provider:
        InsuranceContactProvider;

    readonly providerName:
        string;

    readonly now?:
        () => string;
}


export function createInsurancePrivateContactOrchestrationService(
    database:
        D1Database,
    providerComposition?:
        InsurancePrivateContactProviderComposition
):
    InsuranceContactOrchestrationService |
    undefined {

    if(
        providerComposition ===
            undefined
    ){
        return undefined;
    }

    return createInsuranceContactOrchestrationService({
        relationships:
            createD1RiverCrmPersistence(
                database
            ),

        growth:
            createD1RiverCrmGrowthPersistence(
                database
            ),

        attempts:
            createD1InsuranceContactAttemptPersistence(
                database
            ),

        provider:
            providerComposition.provider,

        providerName:
            providerComposition.providerName,

        now:
            providerComposition.now ??
            (() =>
                new Date().toISOString())
    });
}