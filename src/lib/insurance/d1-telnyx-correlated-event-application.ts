import {
    createD1InsuranceContactAttemptPersistence
} from "./d1-contact-attempt";

import {
    createD1TelnyxCallBridgePersistence
} from "./d1-telnyx-call-bridge";

import {
    createD1TelnyxCallLegCorrelationPersistence
} from "./d1-telnyx-call-correlation";

import {
    createD1TelnyxCorrelatedAttemptReconciliationExecutor
} from "./d1-telnyx-correlated-attempt-reconciliation";

import {
    createTelnyxBridgeEventApplicationService
} from "./telnyx-bridge-event-application";

import {
    createTelnyxCorrelatedEventApplicationService
} from "./telnyx-correlated-event-application";

import {
    createTelnyxCorrelatedEventResolver
} from "./telnyx-correlated-event";


export type D1TelnyxCorrelatedEventApplicationDatabase =
    Parameters<
        typeof createD1InsuranceContactAttemptPersistence
    >[0] &
    Parameters<
        typeof createD1TelnyxCallLegCorrelationPersistence
    >[0] &
    Parameters<
        typeof createD1TelnyxCallBridgePersistence
    >[0] &
    Parameters<
        typeof createD1TelnyxCorrelatedAttemptReconciliationExecutor
    >[0];


export function createD1TelnyxCorrelatedEventApplicationService(
    database:
        D1TelnyxCorrelatedEventApplicationDatabase
){

    const attempts =
        createD1InsuranceContactAttemptPersistence(
            database
        );

    const correlations =
        createD1TelnyxCallLegCorrelationPersistence(
            database
        );

    const bridges =
        createD1TelnyxCallBridgePersistence(
            database
        );

    const resolver =
        createTelnyxCorrelatedEventResolver({
            correlations,
            attempts
        });

    const bridgeApplication =
        createTelnyxBridgeEventApplicationService({
            bridges
        });

    const attemptExecutor =
        createD1TelnyxCorrelatedAttemptReconciliationExecutor(
            database
        );

    return createTelnyxCorrelatedEventApplicationService({
        resolver,
        bridgeApplication,
        attempts,
        attemptExecutor
    });
}
