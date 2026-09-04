import type {
    Entitlement,
    FulfillmentRecord,
    FulfillmentRequest,
    RiverOrder
} from "./types";


export interface FulfillmentPersistence {

    saveOrder(
        order: RiverOrder
    ): Promise<void>;

    getOrder(
        orderId: string
    ): Promise<RiverOrder | undefined>;

    getOrderByProviderOrderOrSessionId(
        providerOrderOrSessionId: string
    ): Promise<RiverOrder | undefined>;

    getOrderByProviderPaymentReference(
        providerPaymentReference: string
    ): Promise<RiverOrder | undefined>;

    saveEntitlement(
        entitlement: Entitlement
    ): Promise<void>;

    getEntitlement(
        entitlementId: string
    ): Promise<Entitlement | undefined>;

    getEntitlementByOrderId(
        orderId: string
    ): Promise<Entitlement | undefined>;

    saveFulfillmentRequest(
        request: FulfillmentRequest
    ): Promise<void>;

    getFulfillmentRequest(
        fulfillmentRequestId: string
    ): Promise<FulfillmentRequest | undefined>;

    getFulfillmentRequestByOrderId(
        orderId: string
    ): Promise<FulfillmentRequest | undefined>;

    saveFulfillmentRecord(
        record: FulfillmentRecord
    ): Promise<void>;

    getFulfillmentRecord(
        fulfillmentId: string
    ): Promise<FulfillmentRecord | undefined>;

    getFulfillmentRecordByRequestId(
        fulfillmentRequestId: string
    ): Promise<FulfillmentRecord | undefined>;

    getFulfillmentRecordByOrderId(
        orderId: string
    ): Promise<FulfillmentRecord | undefined>;

}


function requireIdentity(
    value: string,
    label: string
): string {

    if (
        typeof value !== "string" ||
        value.trim().length === 0 ||
        value.trim() !== value
    ) {
        throw new TypeError(
            `${label} must be a non-empty normalized identifier.`
        );
    }

    return value;
}


function cloneRecord<T>(
    value: T
): T {

    return structuredClone(
        value
    );
}


function assertStableFields<T extends object>(
    existing: T | undefined,
    incoming: T,
    fields: readonly (keyof T)[],
    label: string
): void {

    if (existing === undefined) {
        return;
    }

    for (const field of fields) {

        if (
            existing[field] !==
            incoming[field]
        ) {
            throw new Error(
                `${label} cannot change ${String(field)} under an existing canonical identity.`
            );
        }
    }

}


function assertUniqueBy<T>(
    records: Iterable<T>,
    predicate: (record: T) => boolean,
    canonicalPredicate: (record: T) => boolean,
    label: string
): void {

    for (const record of records) {

        if (
            predicate(record) &&
            !canonicalPredicate(record)
        ) {
            throw new Error(
                `Fulfillment persistence already contains ${label}.`
            );
        }
    }

}


function findUniqueBy<T>(
    records: Iterable<T>,
    predicate: (record: T) => boolean,
    label: string
): T | undefined {

    let match:
        T | undefined;

    for (const record of records) {

        if (!predicate(record)) {
            continue;
        }

        if (match !== undefined) {
            throw new Error(
                `Fulfillment persistence contains duplicate ${label}.`
            );
        }

        match =
            record;
    }

    return match;
}


export class InMemoryFulfillmentPersistence
implements FulfillmentPersistence {

    private readonly orders =
        new Map<string, RiverOrder>();

    private readonly entitlements =
        new Map<string, Entitlement>();

    private readonly fulfillmentRequests =
        new Map<string, FulfillmentRequest>();

    private readonly fulfillmentRecords =
        new Map<string, FulfillmentRecord>();


    public async saveOrder(
        order: RiverOrder
    ): Promise<void> {

        const orderId =
            requireIdentity(
                order.orderId,
                "Order identifier"
            );

        const existing =
            this.orders.get(
                orderId
            );

        assertStableFields(
            existing,
            order,
            [
                "provider",
                "providerOrderOrSessionId",
                "providerPaymentReference",
                "customerReference",
                "deliveryEmail",
                "productId",
                "productVersion",
                "amountMinor",
                "currency",
                "createdAt"
            ],
            "Order"
        );

        assertUniqueBy(
            this.orders.values(),
            (candidate) => {
                return (
                    candidate.providerOrderOrSessionId ===
                    order.providerOrderOrSessionId
                );
            },
            (candidate) => {
                return (
                    candidate.orderId ===
                    orderId
                );
            },
            "provider order or session identity"
        );

        assertUniqueBy(
            this.orders.values(),
            (candidate) => {
                return (
                    candidate.providerPaymentReference ===
                    order.providerPaymentReference
                );
            },
            (candidate) => {
                return (
                    candidate.orderId ===
                    orderId
                );
            },
            "provider payment reference"
        );

        this.orders.set(
            orderId,
            cloneRecord(order)
        );
    }


    public async getOrder(
        orderId: string
    ): Promise<RiverOrder | undefined> {

        const normalizedOrderId =
            requireIdentity(
                orderId,
                "Order identifier"
            );

        const order =
            this.orders.get(
                normalizedOrderId
            );

        return order === undefined
            ? undefined
            : cloneRecord(order);
    }


    public async getOrderByProviderOrderOrSessionId(
        providerOrderOrSessionId: string
    ): Promise<RiverOrder | undefined> {

        const providerId =
            requireIdentity(
                providerOrderOrSessionId,
                "Provider order or session identifier"
            );

        const order =
            findUniqueBy(
                this.orders.values(),
                (candidate) => {
                    return (
                        candidate.providerOrderOrSessionId ===
                        providerId
                    );
                },
                "provider order or session identity"
            );

        return order === undefined
            ? undefined
            : cloneRecord(order);
    }


    public async getOrderByProviderPaymentReference(
        providerPaymentReference: string
    ): Promise<RiverOrder | undefined> {

        const paymentReference =
            requireIdentity(
                providerPaymentReference,
                "Provider payment reference"
            );

        const order =
            findUniqueBy(
                this.orders.values(),
                (candidate) => {
                    return (
                        candidate.providerPaymentReference ===
                        paymentReference
                    );
                },
                "provider payment reference"
            );

        return order === undefined
            ? undefined
            : cloneRecord(order);
    }


    public async saveEntitlement(
        entitlement: Entitlement
    ): Promise<void> {

        const entitlementId =
            requireIdentity(
                entitlement.entitlementId,
                "Entitlement identifier"
            );

        requireIdentity(
            entitlement.orderId,
            "Entitlement order identifier"
        );

        const existing =
            this.entitlements.get(
                entitlementId
            );

        assertStableFields(
            existing,
            entitlement,
            [
                "orderId",
                "customerReference",
                "productId",
                "productVersion",
                "releaseId",
                "createdAt"
            ],
            "Entitlement"
        );

        assertUniqueBy(
            this.entitlements.values(),
            (candidate) => {
                return (
                    candidate.orderId ===
                    entitlement.orderId &&
                    candidate.productId ===
                    entitlement.productId &&
                    candidate.productVersion ===
                    entitlement.productVersion &&
                    candidate.releaseId ===
                    entitlement.releaseId
                );
            },
            (candidate) => {
                return (
                    candidate.entitlementId ===
                    entitlementId
                );
            },
            "order and product release entitlement identity"
        );

        this.entitlements.set(
            entitlementId,
            cloneRecord(entitlement)
        );
    }


    public async getEntitlement(
        entitlementId: string
    ): Promise<Entitlement | undefined> {

        const normalizedEntitlementId =
            requireIdentity(
                entitlementId,
                "Entitlement identifier"
            );

        const entitlement =
            this.entitlements.get(
                normalizedEntitlementId
            );

        return entitlement === undefined
            ? undefined
            : cloneRecord(entitlement);
    }


    public async getEntitlementByOrderId(
        orderId: string
    ): Promise<Entitlement | undefined> {

        const normalizedOrderId =
            requireIdentity(
                orderId,
                "Order identifier"
            );

        const entitlement =
            findUniqueBy(
                this.entitlements.values(),
                (candidate) => {
                    return (
                        candidate.orderId ===
                        normalizedOrderId
                    );
                },
                "entitlement order identity"
            );

        return entitlement === undefined
            ? undefined
            : cloneRecord(entitlement);
    }


    public async saveFulfillmentRequest(
        request: FulfillmentRequest
    ): Promise<void> {

        const requestId =
            requireIdentity(
                request.fulfillmentRequestId,
                "Fulfillment request identifier"
            );

        requireIdentity(
            request.orderId,
            "Fulfillment request order identifier"
        );

        const existing =
            this.fulfillmentRequests.get(
                requestId
            );

        assertStableFields(
            existing,
            request,
            [
                "orderId",
                "productId",
                "productVersion",
                "customerReference",
                "deliveryEmail"
            ],
            "Fulfillment request"
        );

        assertUniqueBy(
            this.fulfillmentRequests.values(),
            (candidate) => {
                return (
                    candidate.orderId ===
                    request.orderId
                );
            },
            (candidate) => {
                return (
                    candidate.fulfillmentRequestId ===
                    requestId
                );
            },
            "fulfillment request order identity"
        );

        this.fulfillmentRequests.set(
            requestId,
            cloneRecord(request)
        );
    }


    public async getFulfillmentRequest(
        fulfillmentRequestId: string
    ): Promise<FulfillmentRequest | undefined> {

        const requestId =
            requireIdentity(
                fulfillmentRequestId,
                "Fulfillment request identifier"
            );

        const request =
            this.fulfillmentRequests.get(
                requestId
            );

        return request === undefined
            ? undefined
            : cloneRecord(request);
    }


    public async getFulfillmentRequestByOrderId(
        orderId: string
    ): Promise<FulfillmentRequest | undefined> {

        const normalizedOrderId =
            requireIdentity(
                orderId,
                "Order identifier"
            );

        const request =
            findUniqueBy(
                this.fulfillmentRequests.values(),
                (candidate) => {
                    return (
                        candidate.orderId ===
                        normalizedOrderId
                    );
                },
                "fulfillment request order identity"
            );

        return request === undefined
            ? undefined
            : cloneRecord(request);
    }


    public async saveFulfillmentRecord(
        record: FulfillmentRecord
    ): Promise<void> {

        const fulfillmentId =
            requireIdentity(
                record.fulfillmentId,
                "Fulfillment identifier"
            );

        requireIdentity(
            record.fulfillmentRequestId,
            "Fulfillment request identifier"
        );

        requireIdentity(
            record.orderId,
            "Fulfillment order identifier"
        );

        const existing =
            this.fulfillmentRecords.get(
                fulfillmentId
            );

        assertStableFields(
            existing,
            record,
            [
                "fulfillmentRequestId",
                "orderId",
                "productId",
                "productVersion",
                "releaseId",
                "entitlementId"
            ],
            "Fulfillment record"
        );

        assertUniqueBy(
            this.fulfillmentRecords.values(),
            (candidate) => {
                return (
                    candidate.fulfillmentRequestId ===
                    record.fulfillmentRequestId
                );
            },
            (candidate) => {
                return (
                    candidate.fulfillmentId ===
                    fulfillmentId
                );
            },
            "fulfillment request identity"
        );

        assertUniqueBy(
            this.fulfillmentRecords.values(),
            (candidate) => {
                return (
                    candidate.orderId ===
                    record.orderId
                );
            },
            (candidate) => {
                return (
                    candidate.fulfillmentId ===
                    fulfillmentId
                );
            },
            "fulfillment order identity"
        );

        this.fulfillmentRecords.set(
            fulfillmentId,
            cloneRecord(record)
        );
    }


    public async getFulfillmentRecord(
        fulfillmentId: string
    ): Promise<FulfillmentRecord | undefined> {

        const normalizedFulfillmentId =
            requireIdentity(
                fulfillmentId,
                "Fulfillment identifier"
            );

        const record =
            this.fulfillmentRecords.get(
                normalizedFulfillmentId
            );

        return record === undefined
            ? undefined
            : cloneRecord(record);
    }


    public async getFulfillmentRecordByRequestId(
        fulfillmentRequestId: string
    ): Promise<FulfillmentRecord | undefined> {

        const requestId =
            requireIdentity(
                fulfillmentRequestId,
                "Fulfillment request identifier"
            );

        const record =
            findUniqueBy(
                this.fulfillmentRecords.values(),
                (candidate) => {
                    return (
                        candidate.fulfillmentRequestId ===
                        requestId
                    );
                },
                "fulfillment request identity"
            );

        return record === undefined
            ? undefined
            : cloneRecord(record);
    }


    public async getFulfillmentRecordByOrderId(
        orderId: string
    ): Promise<FulfillmentRecord | undefined> {

        const normalizedOrderId =
            requireIdentity(
                orderId,
                "Order identifier"
            );

        const record =
            findUniqueBy(
                this.fulfillmentRecords.values(),
                (candidate) => {
                    return (
                        candidate.orderId ===
                        normalizedOrderId
                    );
                },
                "fulfillment order identity"
            );

        return record === undefined
            ? undefined
            : cloneRecord(record);
    }

}


export function createInMemoryFulfillmentPersistence():
FulfillmentPersistence {

    return new InMemoryFulfillmentPersistence();

}
