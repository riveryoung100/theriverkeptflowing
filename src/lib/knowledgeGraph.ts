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

export interface KnowledgeGraphEdge {
    key: string;
    source: string;
    target: string;
    sourceEntry: TopicEntry;
    targetEntry: TopicEntry;
    sharedTopics: string[];
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