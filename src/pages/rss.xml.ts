import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";


interface FeedEntry {
    title: string;
    description: string;
    published: Date;
    link: string;
}


export async function GET(
    context: APIContext
) {

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


    const feedEntries: FeedEntry[] = [

        ...guides.map((entry) => ({
            title: entry.data.title,
            description: entry.data.description,
            published: entry.data.published,
            link: `/library/guides/${entry.id}/`
        })),

        ...essays.map((entry) => ({
            title: entry.data.title,
            description: entry.data.description,
            published: entry.data.published,
            link: `/library/essays/${entry.id}/`
        })),

        ...letters.map((entry) => ({
            title: entry.data.title,
            description: entry.data.description,
            published: entry.data.published,
            link: `/library/letters/${entry.id}/`
        })),

        ...journal.map((entry) => ({
            title: entry.data.title,
            description: entry.data.description,
            published: entry.data.published,
            link: `/library/journal/${entry.id}/`
        })),

        ...recipes.map((entry) => ({
            title: entry.data.title,
            description: entry.data.description,
            published: entry.data.published,
            link: `/library/recipes/${entry.id}/`
        })),

        ...films.map((entry) => ({
            title: entry.data.title,
            description: entry.data.description,
            published: entry.data.published,
            link: `/library/films/${entry.id}/`
        }))

    ].sort((first, second) => {

        return (
            second.published.getTime() -
            first.published.getTime()
        );

    });


    return rss({

        title: "The River Kept Flowing",

        description:
            "Guides, essays, letters, journal entries, recipes, films, and other work from The River Kept Flowing.",

        site:
            context.site ??
            new URL(
                "https://theriverkeptflowing.com"
            ),

        items: feedEntries.map((entry) => ({

            title: entry.title,

            description: entry.description,

            pubDate: entry.published,

            link: entry.link

        })),

        customData: [
            "<language>en-us</language>",
            "<generator>The River Kept Flowing</generator>"
        ].join("")

    });

}