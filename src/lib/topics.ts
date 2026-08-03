import { getCollection } from "astro:content";

export interface TopicEntry {
    collection:
        | "guides"
        | "essays"
        | "letters"
        | "journal"
        | "recipes"
        | "films";
    id: string;
    type: string;
    title: string;
    description: string;
    href: string;
    number?: string;
    tags: string[];
    published: Date;
    readingMinutes?: number;
    featured: boolean;
}

export interface TopicArchive {
    name: string;
    slug: string;
    entries: TopicEntry[];
}

export function normalizeTopicName(
    value: string
): string {

    return value
        .trim()
        .toLowerCase();

}

export function createTopicSlug(
    value: string
): string {

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

export async function getPublishedTopicEntries():
Promise<TopicEntry[]> {

    const guides = (
        await getCollection(
            "guides",
            ({ data }) => {
                return !data.draft;
            }
        )
    ).map((guide): TopicEntry => ({
        collection: "guides",
        id: guide.id,
        type: "River Guide",
        title: guide.data.title,
        description: guide.data.description,
        href: `/library/guides/${guide.id}/`,
        number: `Guide ${String(
            guide.data.guideNumber
        ).padStart(
            3,
            "0"
        )}`,
        tags: guide.data.tags,
        published: guide.data.published,
        readingMinutes:
            guide.data.readingMinutes,
        featured: guide.data.featured
    }));


    const essays = (
        await getCollection(
            "essays",
            ({ data }) => {
                return !data.draft;
            }
        )
    ).map((essay): TopicEntry => ({
        collection: "essays",
        id: essay.id,
        type: "Essay",
        title: essay.data.title,
        description: essay.data.description,
        href: `/library/essays/${essay.id}/`,
        tags: essay.data.tags,
        published: essay.data.published,
        readingMinutes:
            essay.data.readingMinutes,
        featured: essay.data.featured
    }));


    const letters = (
        await getCollection(
            "letters",
            ({ data }) => {
                return !data.draft;
            }
        )
    ).map((letter): TopicEntry => ({
        collection: "letters",
        id: letter.id,
        type: "Letter",
        title: letter.data.title,
        description: letter.data.description,
        href: `/library/letters/${letter.id}/`,
        tags: letter.data.tags,
        published: letter.data.published,
        readingMinutes:
            letter.data.readingMinutes,
        featured: letter.data.featured
    }));


    const journal = (
        await getCollection(
            "journal",
            ({ data }) => {
                return !data.draft;
            }
        )
    ).map((entry): TopicEntry => ({
        collection: "journal",
        id: entry.id,
        type: "Journal Entry",
        title: entry.data.title,
        description: entry.data.description,
        href: `/library/journal/${entry.id}/`,
        tags: entry.data.tags,
        published: entry.data.published,
        readingMinutes:
            entry.data.readingMinutes,
        featured: entry.data.featured
    }));


    const recipes = (
        await getCollection(
            "recipes",
            ({ data }) => {
                return !data.draft;
            }
        )
    ).map((recipe): TopicEntry => ({
        collection: "recipes",
        id: recipe.id,
        type: "Recipe",
        title: recipe.data.title,
        description: recipe.data.description,
        href: `/library/recipes/${recipe.id}/`,
        tags: recipe.data.tags,
        published: recipe.data.published,
        readingMinutes:
            recipe.data.readingMinutes,
        featured: recipe.data.featured
    }));


    const films = (
        await getCollection(
            "films",
            ({ data }) => {
                return !data.draft;
            }
        )
    ).map((film): TopicEntry => ({
        collection: "films",
        id: film.id,
        type: "Film",
        title: film.data.title,
        description: film.data.description,
        href: `/library/films/${film.id}/`,
        tags: film.data.tags,
        published: film.data.published,
        readingMinutes:
            film.data.readingMinutes,
        featured: film.data.featured
    }));


    return [
        ...guides,
        ...essays,
        ...letters,
        ...journal,
        ...recipes,
        ...films
    ].sort((first, second) => {
        return (
            second.published.getTime() -
            first.published.getTime()
        );
    });

}

export async function getTopicArchives():
Promise<TopicArchive[]> {

    const entries =
        await getPublishedTopicEntries();

    const topics =
        new Map<string, TopicArchive>();


    for (const entry of entries) {

        for (const originalTag of entry.tags) {

            const name =
                originalTag.trim();

            const slug =
                createTopicSlug(name);


            if (!slug) {

                continue;

            }


            const existingTopic =
                topics.get(slug);


            if (existingTopic) {

                const alreadyIncluded =
                    existingTopic.entries.some(
                        (existingEntry) => {
                            return (
                                existingEntry.collection ===
                                    entry.collection &&
                                existingEntry.id ===
                                    entry.id
                            );
                        }
                    );


                if (!alreadyIncluded) {

                    existingTopic.entries.push(
                        entry
                    );

                }


                continue;

            }


            topics.set(
                slug,
                {
                    name,
                    slug,
                    entries: [
                        entry
                    ]
                }
            );

        }

    }


    return Array
        .from(
            topics.values()
        )
        .sort((first, second) => {

            if (
                second.entries.length !==
                first.entries.length
            ) {

                return (
                    second.entries.length -
                    first.entries.length
                );

            }


            return first.name.localeCompare(
                second.name
            );

        });

}