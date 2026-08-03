import {
    getPublishedTopicEntries,
    normalizeTopicName,
    type TopicEntry
} from "./topics";

export interface SemanticScoreBreakdown {
    sharedTopicScore: number;
    titleSimilarityScore: number;
    descriptionSimilarityScore: number;
    sameCollectionScore: number;
    featuredScore: number;
    recencyScore: number;
}

export interface SemanticRecommendation
extends TopicEntry {
    key: string;
    score: number;
    sharedTopics: string[];
    sharedTitleTerms: string[];
    sharedDescriptionTerms: string[];
    reasons: string[];
    breakdown: SemanticScoreBreakdown;
}

export interface SemanticRecommendationOptions {
    limit?: number;
    minimumScore?: number;
}

const STOP_WORDS =
    new Set([
        "a",
        "about",
        "after",
        "all",
        "also",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "because",
        "been",
        "before",
        "being",
        "between",
        "both",
        "but",
        "by",
        "can",
        "could",
        "do",
        "does",
        "for",
        "from",
        "guide",
        "handbook",
        "has",
        "have",
        "how",
        "if",
        "in",
        "insurance",
        "into",
        "is",
        "it",
        "its",
        "may",
        "more",
        "most",
        "not",
        "of",
        "on",
        "or",
        "our",
        "should",
        "that",
        "the",
        "their",
        "them",
        "there",
        "these",
        "they",
        "this",
        "through",
        "to",
        "understand",
        "understanding",
        "was",
        "we",
        "what",
        "when",
        "where",
        "which",
        "who",
        "why",
        "will",
        "with",
        "you",
        "your"
    ]);

function createEntryKey(
    entry: TopicEntry
): string {

    return `${entry.collection}:${entry.id}`;

}

function normalizeText(
    value: unknown
): string {

    if (
        typeof value !== "string"
    ) {

        return "";

    }


    return value
        .normalize("NFKD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}

function tokenize(
    value: unknown
): string[] {

    const normalizedValue =
        normalizeText(
            value
        );


    if (!normalizedValue) {

        return [];

    }


    return Array
        .from(
            new Set(
                normalizedValue
                    .split(" ")
                    .filter((token) => {
                        return (
                            token.length >= 3 &&
                            !STOP_WORDS.has(
                                token
                            )
                        );
                    })
            )
        )
        .sort();

}

function intersect(
    first: string[],
    second: string[]
): string[] {

    const secondSet =
        new Set(
            second
        );


    return first.filter((value) => {
        return secondSet.has(
            value
        );
    });

}

function calculateJaccardSimilarity(
    first: string[],
    second: string[]
): number {

    if (
        first.length === 0 ||
        second.length === 0
    ) {

        return 0;

    }


    const union =
        new Set([
            ...first,
            ...second
        ]);

    const shared =
        intersect(
            first,
            second
        );


    if (union.size === 0) {

        return 0;

    }


    return (
        shared.length /
        union.size
    );

}

function getNormalizedTopics(
    entry: TopicEntry
): Map<string, string> {

    const topics =
        new Map<string, string>();


    for (
        const tag of
        entry.tags ?? []
    ) {

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

function getSharedTopics(
    currentEntry: TopicEntry,
    candidateEntry: TopicEntry
): string[] {

    const currentTopics =
        getNormalizedTopics(
            currentEntry
        );

    const candidateTopics =
        getNormalizedTopics(
            candidateEntry
        );


    return Array
        .from(
            currentTopics.keys()
        )
        .filter((topic) => {
            return candidateTopics.has(
                topic
            );
        })
        .map((topic) => {
            return (
                currentTopics.get(
                    topic
                ) ??
                candidateTopics.get(
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

}

function calculateRecencyScore(
    candidateEntry: TopicEntry
): number {

    const publishedTime =
        candidateEntry
            .published
            .getTime();

    const ageInDays =
        Math.max(
            0,
            (
                Date.now() -
                publishedTime
            ) /
            86_400_000
        );


    if (ageInDays <= 30) {

        return 1;

    }


    if (ageInDays <= 90) {

        return 0.75;

    }


    if (ageInDays <= 180) {

        return 0.5;

    }


    if (ageInDays <= 365) {

        return 0.25;

    }


    return 0;

}

export function scoreSemanticRecommendation(
    currentEntry: TopicEntry,
    candidateEntry: TopicEntry
): SemanticRecommendation {

    const sharedTopics =
        getSharedTopics(
            currentEntry,
            candidateEntry
        );

    const currentTitleTerms =
        tokenize(
            currentEntry.title
        );

    const candidateTitleTerms =
        tokenize(
            candidateEntry.title
        );

    const sharedTitleTerms =
        intersect(
            currentTitleTerms,
            candidateTitleTerms
        );

    const titleSimilarity =
        calculateJaccardSimilarity(
            currentTitleTerms,
            candidateTitleTerms
        );

    const currentDescriptionTerms =
        tokenize(
            currentEntry.description
        );

    const candidateDescriptionTerms =
        tokenize(
            candidateEntry.description
        );

    const sharedDescriptionTerms =
        intersect(
            currentDescriptionTerms,
            candidateDescriptionTerms
        );

    const descriptionSimilarity =
        calculateJaccardSimilarity(
            currentDescriptionTerms,
            candidateDescriptionTerms
        );

    const sharedTopicScore =
        sharedTopics.length * 12;

    const titleSimilarityScore =
        Math.round(
            titleSimilarity * 20
        );

    const descriptionSimilarityScore =
        Math.round(
            descriptionSimilarity * 28
        );

    const sameCollectionScore = (
        currentEntry.collection ===
        candidateEntry.collection
    )
        ? 4
        : 0;

    const featuredScore =
        candidateEntry.featured
            ? 2
            : 0;

    const recencyScore =
        calculateRecencyScore(
            candidateEntry
        );

    const breakdown:
    SemanticScoreBreakdown = {
        sharedTopicScore,
        titleSimilarityScore,
        descriptionSimilarityScore,
        sameCollectionScore,
        featuredScore,
        recencyScore
    };

    const score =
        sharedTopicScore +
        titleSimilarityScore +
        descriptionSimilarityScore +
        sameCollectionScore +
        featuredScore +
        recencyScore;

    const reasons: string[] =
        [];


    if (
        sharedTopics.length > 0
    ) {

        reasons.push(
            sharedTopics.length === 1
                ? `Shared topic: ${sharedTopics[0]}`
                : `Shared topics: ${sharedTopics.join(", ")}`
        );

    }


    if (
        sharedDescriptionTerms.length >
        0
    ) {

        reasons.push(
            `Related ideas: ${sharedDescriptionTerms
                .slice(
                    0,
                    4
                )
                .join(", ")}`
        );

    }


    if (
        sharedTitleTerms.length > 0
    ) {

        reasons.push(
            `Related title terms: ${sharedTitleTerms.join(", ")}`
        );

    }


    if (
        currentEntry.collection ===
        candidateEntry.collection
    ) {

        reasons.push(
            `More from ${candidateEntry.type}`
        );

    }


    return {
        ...candidateEntry,
        key:
            createEntryKey(
                candidateEntry
            ),
        score,
        sharedTopics,
        sharedTitleTerms,
        sharedDescriptionTerms,
        reasons,
        breakdown
    };

}

export function rankSemanticRecommendations(
    currentEntry: TopicEntry,
    candidateEntries: TopicEntry[],
    options: SemanticRecommendationOptions = {}
): SemanticRecommendation[] {

    const limit =
        options.limit ?? 3;

    const minimumScore =
        options.minimumScore ?? 1;

    const currentKey =
        createEntryKey(
            currentEntry
        );


    return candidateEntries
        .filter((candidateEntry) => {
            return (
                createEntryKey(
                    candidateEntry
                ) !== currentKey
            );
        })
        .map((candidateEntry) => {
            return scoreSemanticRecommendation(
                currentEntry,
                candidateEntry
            );
        })
        .filter((recommendation) => {
            return (
                recommendation.score >=
                minimumScore
            );
        })
        .sort((first, second) => {

            if (
                second.score !==
                first.score
            ) {

                return (
                    second.score -
                    first.score
                );

            }


            if (
                second.sharedTopics.length !==
                first.sharedTopics.length
            ) {

                return (
                    second.sharedTopics.length -
                    first.sharedTopics.length
                );

            }


            if (
                second.published.getTime() !==
                first.published.getTime()
            ) {

                return (
                    second.published.getTime() -
                    first.published.getTime()
                );

            }


            return first.title.localeCompare(
                second.title
            );

        })
        .slice(
            0,
            Math.max(
                0,
                limit
            )
        );

}

export async function getSemanticRecommendations(
    currentEntry: TopicEntry,
    options: SemanticRecommendationOptions = {}
): Promise<SemanticRecommendation[]> {

    const entries =
        await getPublishedTopicEntries();


    return rankSemanticRecommendations(
        currentEntry,
        entries,
        options
    );

}