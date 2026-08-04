import {
    getPublishedTopicEntries,
    normalizeTopicName,
    type TopicEntry
} from "./topics";

export interface KnowledgeGraphNode
extends TopicEntry {
    key: string;
    connectionCount: number;
    totalWeight: number;
}

export type KnowledgeGraphRelationshipType =
    | "shared-topic"
    | "related"
    | "prerequisite"
    | "next-reading"
    | "learning-path";

export interface KnowledgeGraphEdge {
    key: string;
    source: string;
    target: string;
    sourceEntry: TopicEntry;
    targetEntry: TopicEntry;
    sharedTopics: string[];
    relationshipType:
        KnowledgeGraphRelationshipType;
    relationshipLabel: string;
    directed: boolean;
    weight: number;
}

export interface KnowledgeGraph {
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
    topics: string[];
}

function createEntryKey(
    entry: TopicEntry
): string {

    return `${entry.collection}:${entry.id}`;

}

function getNormalizedTopics(
    entry: TopicEntry
): Map<string, string> {

    const topics =
        new Map<string, string>();


    for (const tag of entry.tags ?? []) {

        if (
            typeof tag !== "string"
        ) {

            continue;

        }


        const displayName =
            tag.trim();

        const normalizedName =
            normalizeTopicName(
                displayName
            );


        if (
            !displayName ||
            !normalizedName
        ) {

            continue;

        }


        if (
            !topics.has(
                normalizedName
            )
        ) {

            topics.set(
                normalizedName,
                displayName
            );

        }

    }


    return topics;

}

function normalizeEntryReference(
    value: string
): string {

    let normalized =
        value.trim();


    if (!normalized) {

        return "";

    }


    try {

        if (
            normalized.startsWith(
                "http://"
            ) ||
            normalized.startsWith(
                "https://"
            )
        ) {

            normalized =
                new URL(
                    normalized
                ).pathname;

        }

    }
    catch {

        return "";

    }


    normalized =
        normalized
            .replace(
                /\\/g,
                "/"
            )
            .replace(
                /\/index\.html$/i,
                "/"
            )
            .replace(
                /\/+/g,
                "/"
            );


    if (
        normalized.startsWith(
            "/"
        ) &&
        normalized.length > 1
    ) {

        normalized =
            normalized.replace(
                /\/+$/,
                ""
            );

    }


    return normalized;

}

function getRelationshipLabel(
    relationshipType:
        KnowledgeGraphRelationshipType
): string {

    switch (relationshipType) {

        case "shared-topic":

            return "Shared topic";

        case "related":

            return "Related";

        case "prerequisite":

            return "Prerequisite";

        case "next-reading":

            return "Next reading";

        case "learning-path":

            return "Learning path";

    }

}

export async function getKnowledgeGraph():
Promise<KnowledgeGraph> {

    const entries =
        await getPublishedTopicEntries();

    const connectionTotals =
        new Map<
            string,
            {
                connectionCount: number;
                totalWeight: number;
            }
        >();

    const edges: KnowledgeGraphEdge[] =
        [];

    const entriesByKey =
        new Map<string, TopicEntry>();

    const entriesByHref =
        new Map<string, TopicEntry>();

    const entriesById =
        new Map<string, TopicEntry[]>();


    for (const entry of entries) {

        const entryKey =
            createEntryKey(
                entry
            );

        const normalizedHref =
            normalizeEntryReference(
                entry.href
            );


        entriesByKey.set(
            entryKey,
            entry
        );


        if (normalizedHref) {

            entriesByHref.set(
                normalizedHref,
                entry
            );

        }


        const idEntries =
            entriesById.get(
                entry.id
            ) ?? [];


        idEntries.push(
            entry
        );


        entriesById.set(
            entry.id,
            idEntries
        );

    }


    function resolveRelationshipReference(
        reference: string
    ): TopicEntry | null {

        const normalizedReference =
            normalizeEntryReference(
                reference
            );


        if (!normalizedReference) {

            return null;

        }


        const keyEntry =
            entriesByKey.get(
                normalizedReference
            );


        if (keyEntry) {

            return keyEntry;

        }


        const hrefEntry =
            entriesByHref.get(
                normalizedReference
            );


        if (hrefEntry) {

            return hrefEntry;

        }


        const referenceWithoutSlash =
            normalizedReference.replace(
                /^\/+/,
                ""
            );

        const directIdEntries =
            entriesById.get(
                referenceWithoutSlash
            ) ?? [];


        if (
            directIdEntries.length === 1
        ) {

            return directIdEntries[0];

        }


        const pathParts =
            referenceWithoutSlash
                .split(
                    "/"
                )
                .filter(Boolean);

        const finalPathPart =
            pathParts[
                pathParts.length - 1
            ] ?? "";

        const finalPathEntries =
            entriesById.get(
                finalPathPart
            ) ?? [];


        if (
            finalPathEntries.length === 1
        ) {

            return finalPathEntries[0];

        }


        return null;

    }


    for (
        let sourceIndex = 0;
        sourceIndex < entries.length;
        sourceIndex += 1
    ) {

        const sourceEntry =
            entries[sourceIndex];

        const sourceKey =
            createEntryKey(
                sourceEntry
            );

        const sourceTopics =
            getNormalizedTopics(
                sourceEntry
            );


        if (
            !connectionTotals.has(
                sourceKey
            )
        ) {

            connectionTotals.set(
                sourceKey,
                {
                    connectionCount: 0,
                    totalWeight: 0
                }
            );

        }


        for (
            let targetIndex =
                sourceIndex + 1;

            targetIndex <
                entries.length;

            targetIndex += 1
        ) {

            const targetEntry =
                entries[targetIndex];

            const targetKey =
                createEntryKey(
                    targetEntry
                );

            const targetTopics =
                getNormalizedTopics(
                    targetEntry
                );

            const sharedTopics =
                Array
                    .from(
                        sourceTopics.keys()
                    )
                    .filter((topic) => {
                        return targetTopics.has(
                            topic
                        );
                    })
                    .map((topic) => {
                        return (
                            sourceTopics.get(
                                topic
                            ) ??
                            targetTopics.get(
                                topic
                            ) ??
                            topic
                        );
                    })
                    .sort((first, second) => {
                        return first.localeCompare(
                            second
                        );
                    });


            if (
                sharedTopics.length === 0
            ) {

                continue;

            }


            const weight =
                sharedTopics.length;


            edges.push({
                key:
                    `${sourceKey}--${targetKey}`,
                source: sourceKey,
                target: targetKey,
                sourceEntry,
                targetEntry,
                sharedTopics,
                relationshipType:
                    "shared-topic",
                relationshipLabel:
                    "Shared topic",
                directed:
                    false,
                weight
            });


            const sourceTotals =
                connectionTotals.get(
                    sourceKey
                ) ?? {
                    connectionCount: 0,
                    totalWeight: 0
                };

            sourceTotals.connectionCount +=
                1;

            sourceTotals.totalWeight +=
                weight;

            connectionTotals.set(
                sourceKey,
                sourceTotals
            );


            const targetTotals =
                connectionTotals.get(
                    targetKey
                ) ?? {
                    connectionCount: 0,
                    totalWeight: 0
                };

            targetTotals.connectionCount +=
                1;

            targetTotals.totalWeight +=
                weight;

            connectionTotals.set(
                targetKey,
                targetTotals
            );

        }

    }


    const manualRelationshipDefinitions = [
        {
            field:
                "related",
            relationshipType:
                "related",
            relationshipLabel:
                getRelationshipLabel(
                    "related"
                ),
            weight:
                4,
            directed:
                false,
            reverseDirection:
                false
        },
        {
            field:
                "prerequisites",
            relationshipType:
                "prerequisite",
            relationshipLabel:
                getRelationshipLabel(
                    "prerequisite"
                ),
            weight:
                7,
            directed:
                true,
            reverseDirection:
                true
        },
        {
            field:
                "nextReading",
            relationshipType:
                "next-reading",
            relationshipLabel:
                getRelationshipLabel(
                    "next-reading"
                ),
            weight:
                6,
            directed:
                true,
            reverseDirection:
                false
        },
        {
            field:
                "learningPath",
            relationshipType:
                "learning-path",
            relationshipLabel:
                getRelationshipLabel(
                    "learning-path"
                ),
            weight:
                5,
            directed:
                true,
            reverseDirection:
                false
        }
    ] as const;

    const manualEdgeKeys =
        new Set<string>();


    for (const declaringEntry of entries) {

        for (
            const relationship of
            manualRelationshipDefinitions
        ) {

            const references =
                declaringEntry[
                    relationship.field
                ] ?? [];


            for (const reference of references) {

                const referencedEntry =
                    resolveRelationshipReference(
                        reference
                    );


                if (!referencedEntry) {

                    continue;

                }


                let sourceEntry =
                    relationship.reverseDirection
                        ? referencedEntry
                        : declaringEntry;

                let targetEntry =
                    relationship.reverseDirection
                        ? declaringEntry
                        : referencedEntry;

                let sourceKey =
                    createEntryKey(
                        sourceEntry
                    );

                let targetKey =
                    createEntryKey(
                        targetEntry
                    );


                if (
                    sourceKey ===
                    targetKey
                ) {

                    continue;

                }


                if (
                    !relationship.directed &&
                    sourceKey.localeCompare(
                        targetKey
                    ) > 0
                ) {

                    [
                        sourceEntry,
                        targetEntry
                    ] = [
                        targetEntry,
                        sourceEntry
                    ];

                    [
                        sourceKey,
                        targetKey
                    ] = [
                        targetKey,
                        sourceKey
                    ];

                }


                const edgeKey =
                    relationship.relationshipType +
                    ":" +
                    sourceKey +
                    "--" +
                    targetKey;


                if (
                    manualEdgeKeys.has(
                        edgeKey
                    )
                ) {

                    continue;

                }


                manualEdgeKeys.add(
                    edgeKey
                );


                edges.push({
                    key:
                        edgeKey,
                    source:
                        sourceKey,
                    target:
                        targetKey,
                    sourceEntry,
                    targetEntry,
                    sharedTopics:
                        [],
                    relationshipType:
                        relationship
                            .relationshipType,
                    relationshipLabel:
                        relationship
                            .relationshipLabel,
                    directed:
                        relationship.directed,
                    weight:
                        relationship.weight
                });


                const sourceTotals =
                    connectionTotals.get(
                        sourceKey
                    ) ?? {
                        connectionCount:
                            0,
                        totalWeight:
                            0
                    };


                sourceTotals.connectionCount +=
                    1;

                sourceTotals.totalWeight +=
                    relationship.weight;


                connectionTotals.set(
                    sourceKey,
                    sourceTotals
                );


                const targetTotals =
                    connectionTotals.get(
                        targetKey
                    ) ?? {
                        connectionCount:
                            0,
                        totalWeight:
                            0
                    };


                targetTotals.connectionCount +=
                    1;

                targetTotals.totalWeight +=
                    relationship.weight;


                connectionTotals.set(
                    targetKey,
                    targetTotals
                );

            }

        }

    }


    const nodes =
        entries
            .map(
                (
                    entry
                ): KnowledgeGraphNode => {

                    const key =
                        createEntryKey(
                            entry
                        );

                    const totals =
                        connectionTotals.get(
                            key
                        ) ?? {
                            connectionCount: 0,
                            totalWeight: 0
                        };


                    return {
                        ...entry,
                        key,
                        connectionCount:
                            totals.connectionCount,
                        totalWeight:
                            totals.totalWeight
                    };

                }
            )
            .sort((first, second) => {

                if (
                    second.totalWeight !==
                    first.totalWeight
                ) {

                    return (
                        second.totalWeight -
                        first.totalWeight
                    );

                }


                if (
                    second.connectionCount !==
                    first.connectionCount
                ) {

                    return (
                        second.connectionCount -
                        first.connectionCount
                    );

                }


                return first.title.localeCompare(
                    second.title
                );

            });


    edges.sort((first, second) => {

        if (
            second.weight !==
            first.weight
        ) {

            return (
                second.weight -
                first.weight
            );

        }


        return first.key.localeCompare(
            second.key
        );

    });


    const topics =
        Array
            .from(
                new Set(
                    entries.flatMap(
                        (entry) => {
                            return (
                                entry.tags ?? []
                            )
                                .filter(
                                    (
                                        tag
                                    ): tag is string => {
                                        return (
                                            typeof tag ===
                                                "string" &&
                                            tag.trim()
                                                .length >
                                                0
                                        );
                                    }
                                )
                                .map((tag) => {
                                    return tag.trim();
                                });
                        }
                    )
                )
            )
            .sort((first, second) => {
                return first.localeCompare(
                    second
                );
            });


    return {
        nodes,
        edges,
        topics
    };

}