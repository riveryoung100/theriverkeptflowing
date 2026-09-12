function encodeIdentity(
    parts: readonly unknown[]
): string {

    return JSON.stringify(
        parts
    );

}


export function createSemanticRelationIdentity(
    fromKey: string,
    toKey: string,
    relationType: string
): string {

    return encodeIdentity([
        "relation",
        fromKey,
        toKey,
        relationType
    ]);

}


export function createSemanticClaimObjectIdentity(
    objectKey: string | undefined,
    objectValue: string | undefined
): string {

    return objectKey !==
        undefined
        ? encodeIdentity([
            "key",
            objectKey
        ])
        : encodeIdentity([
            "value",
            objectValue ??
                ""
        ]);

}


export function createSemanticClaimIdentity(
    subjectKey: string,
    predicate: string,
    objectKey: string | undefined,
    objectValue: string | undefined
): string {

    return encodeIdentity([
        "claim",
        subjectKey,
        predicate,
        createSemanticClaimObjectIdentity(
            objectKey,
            objectValue
        )
    ]);

}


export function createSemanticScopedIdentity(
    scope: "semantic-relation" | "semantic-claim",
    derivativeId: string,
    durableIdentity: string
): string {

    return encodeIdentity([
        scope,
        derivativeId,
        durableIdentity
    ]);

}
