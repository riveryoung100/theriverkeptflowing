import {
    getCollection,
    type CollectionEntry
} from "astro:content";

export type SeriesCollectionName =
    | "guides"
    | "essays"
    | "letters"
    | "journal"
    | "recipes"
    | "films";

export interface SeriesEntry {
    collection: SeriesCollectionName;
    collectionLabel: string;
    id: string;
    title: string;
    description: string;
    published: Date;
    updated?: Date;
    tags: string[];
    featured: boolean;
    readingMinutes?: number;
    series: string;
    seriesOrder: number;
    href: string;
}

export interface ContentSeries {
    name: string;
    slug: string;
    description: string;
    entries: SeriesEntry[];
    entryCount: number;
    collections: string[];
    firstPublished?: Date;
    lastPublished?: Date;
}

const collectionSettings: Record<
    SeriesCollectionName,
    {
        label: string;
        route: string;
    }
> = {
    guides: {
        label: "Guide",
        route: "/library/guides/"
    },

    essays: {
        label: "Essay",
        route: "/library/essays/"
    },

    letters: {
        label: "Letter",
        route: "/library/letters/"
    },

    journal: {
        label: "Journal",
        route: "/library/journal/"
    },

    recipes: {
        label: "Recipe",
        route: "/library/recipes/"
    },

    films: {
        label: "Film",
        route: "/library/films/"
    }
};

export function createSeriesSlug(
    value: unknown
): string {

    if (
        typeof value !== "string"
    ) {

        return "";

    }


    return value
        .trim()
        .normalize("NFKD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );

}

function createSeriesDescription(
    name: string,
    entries: SeriesEntry[]
): string {

    if (
        name ===
        "Insurance Handbook Series"
    ) {

        return (
            "A practical collection of insurance handbooks " +
            "created to help individuals and families understand " +
            "coverage, risk, protection, and financial responsibility."
        );

    }


    const collections =
        Array.from(
            new Set(
                entries.map((entry) => {
                    return entry.collectionLabel.toLowerCase();
                })
            )
        );


    return (
        `An ordered River Library series containing ` +
        `${entries.length} published ` +
        `${entries.length === 1 ? "work" : "works"}` +
        (
            collections.length > 0
                ? ` across ${collections.join(", ")}.`
                : "."
        )
    );

}

function normalizeEntry<
    TCollection extends SeriesCollectionName
>(
    collection: TCollection,
    entry: CollectionEntry<TCollection>
): SeriesEntry | null {

    const series =
        entry.data.series?.trim();

    const seriesOrder =
        entry.data.seriesOrder;


    if (
        !series ||
        typeof seriesOrder !== "number"
    ) {

        return null;

    }


    const settings =
        collectionSettings[collection];


    return {
        collection,
        collectionLabel:
            settings.label,
        id:
            entry.id,
        title:
            entry.data.title,
        description:
            entry.data.description,
        published:
            entry.data.published,
        updated:
            entry.data.updated,
        tags:
            entry.data.tags ?? [],
        featured:
            entry.data.featured ?? false,
        readingMinutes:
            entry.data.readingMinutes,
        series,
        seriesOrder,
        href:
            `${settings.route}${entry.id}/`
    };

}

export async function getPublishedSeriesEntries():
Promise<SeriesEntry[]> {

    const [
        guides,
        essays,
        letters,
        journal,
        recipes,
        films
    ] = await Promise.all([
        getCollection(
            "guides",
            ({ data }) => !data.draft
        ),

        getCollection(
            "essays",
            ({ data }) => !data.draft
        ),

        getCollection(
            "letters",
            ({ data }) => !data.draft
        ),

        getCollection(
            "journal",
            ({ data }) => !data.draft
        ),

        getCollection(
            "recipes",
            ({ data }) => !data.draft
        ),

        getCollection(
            "films",
            ({ data }) => !data.draft
        )
    ]);


    const entries = [
        ...guides.map((entry) => {
            return normalizeEntry(
                "guides",
                entry
            );
        }),

        ...essays.map((entry) => {
            return normalizeEntry(
                "essays",
                entry
            );
        }),

        ...letters.map((entry) => {
            return normalizeEntry(
                "letters",
                entry
            );
        }),

        ...journal.map((entry) => {
            return normalizeEntry(
                "journal",
                entry
            );
        }),

        ...recipes.map((entry) => {
            return normalizeEntry(
                "recipes",
                entry
            );
        }),

        ...films.map((entry) => {
            return normalizeEntry(
                "films",
                entry
            );
        })
    ];


    return entries
        .filter(
            (
                entry
            ): entry is SeriesEntry => {
                return entry !== null;
            }
        )
        .sort((first, second) => {

            const seriesComparison =
                first.series.localeCompare(
                    second.series
                );


            if (seriesComparison !== 0) {

                return seriesComparison;

            }


            if (
                first.seriesOrder !==
                second.seriesOrder
            ) {

                return (
                    first.seriesOrder -
                    second.seriesOrder
                );

            }


            return first.published.getTime() -
                second.published.getTime();

        });

}

export async function getContentSeries():
Promise<ContentSeries[]> {

    const entries =
        await getPublishedSeriesEntries();

    const seriesMap =
        new Map<string, SeriesEntry[]>();


    for (const entry of entries) {

        const existing =
            seriesMap.get(
                entry.series
            ) ?? [];


        existing.push(
            entry
        );


        seriesMap.set(
            entry.series,
            existing
        );

    }


    return Array
        .from(
            seriesMap.entries()
        )
        .map(
            (
                [
                    name,
                    seriesEntries
                ]
            ): ContentSeries => {

                const orderedEntries =
                    [...seriesEntries]
                        .sort(
                            (
                                first,
                                second
                            ) => {

                                if (
                                    first.seriesOrder !==
                                    second.seriesOrder
                                ) {

                                    return (
                                        first.seriesOrder -
                                        second.seriesOrder
                                    );

                                }


                                return (
                                    first.published.getTime() -
                                    second.published.getTime()
                                );

                            }
                        );


                const publicationDates =
                    orderedEntries
                        .map((entry) => {
                            return entry.published;
                        })
                        .sort((first, second) => {
                            return (
                                first.getTime() -
                                second.getTime()
                            );
                        });


                return {
                    name,
                    slug:
                        createSeriesSlug(
                            name
                        ),
                    description:
                        createSeriesDescription(
                            name,
                            orderedEntries
                        ),
                    entries:
                        orderedEntries,
                    entryCount:
                        orderedEntries.length,
                    collections:
                        Array.from(
                            new Set(
                                orderedEntries.map(
                                    (entry) => {
                                        return (
                                            entry.collectionLabel
                                        );
                                    }
                                )
                            )
                        ),
                    firstPublished:
                        publicationDates[0],
                    lastPublished:
                        publicationDates[
                            publicationDates.length -
                            1
                        ]
                };

            }
        )
        .filter((series) => {
            return Boolean(
                series.slug
            );
        })
        .sort((first, second) => {
            return first.name.localeCompare(
                second.name
            );
        });

}

export async function getContentSeriesBySlug(
    slug: string
): Promise<ContentSeries | undefined> {

    const series =
        await getContentSeries();


    return series.find((item) => {
        return item.slug === slug;
    });

}

export interface SeriesNavigationResult {
    series: ContentSeries;
    current: SeriesEntry;
    previous?: SeriesEntry;
    next?: SeriesEntry;
    position: number;
    total: number;
    seriesHref: string;
}

export async function getSeriesNavigation(
    collection: SeriesCollectionName,
    id: string
): Promise<SeriesNavigationResult | undefined> {

    const allSeries =
        await getContentSeries();


    for (const series of allSeries) {

        const currentIndex =
            series.entries.findIndex(
                (entry) => {
                    return (
                        entry.collection === collection &&
                        entry.id === id
                    );
                }
            );


        if (currentIndex === -1) {

            continue;

        }


        return {
            series,
            current:
                series.entries[currentIndex],
            previous:
                currentIndex > 0
                    ? series.entries[
                        currentIndex - 1
                    ]
                    : undefined,
            next:
                currentIndex <
                    series.entries.length - 1
                    ? series.entries[
                        currentIndex + 1
                    ]
                    : undefined,
            position:
                currentIndex + 1,
            total:
                series.entries.length,
            seriesHref:
                `/series/${series.slug}/`
        };

    }


    return undefined;

}