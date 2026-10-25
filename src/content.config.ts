import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { contentDateSchema } from "./lib/contentDates";

const sharedSchema = z.object({
    title: z.string(),
    description: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    published: contentDateSchema,
    updated: contentDateSchema.optional(),
    author: z.string().default("River Young"),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    related: z.array(z.string()).optional(),

    prerequisites: z.array(z.string()).optional(),

    nextReading: z.array(z.string()).optional(),

    learningPath: z.array(z.string()).optional(),
    series: z.string().optional(),
    seriesOrder: z.number().int().positive().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    readingMinutes: z.number().int().positive().optional()
});

const guides = defineCollection({
    loader: glob({
        base: "./src/content/guides",
        pattern: "**/*.{md,mdx}"
    }),
    schema: sharedSchema.extend({
        category: z.string(),
        guideNumber: z.number().int().positive().optional(),
        version: z.string().default("1.0"),

    })
});

const letters = defineCollection({
    loader: glob({
        base: "./src/content/letters",
        pattern: "**/*.{md,mdx}"
    }),
    schema: sharedSchema.extend({
        recipient: z.string().optional(),
        letterNumber: z.number().int().positive().optional()
    })
});

const essays = defineCollection({
    loader: glob({
        base: "./src/content/essays",
        pattern: "**/*.{md,mdx}"
    }),
    schema: sharedSchema.extend({
        category: z.string().optional(),
        // Explicit null means the historical publication date is unverified.
        published: contentDateSchema.nullable(),
        sourceScriptId: z.string().optional(),
        sourceScriptSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
        sourceVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),
        sourceVideoPublishedAt: contentDateSchema.optional(),

    })
});

const journal = defineCollection({
    loader: glob({
        base: "./src/content/journal",
        pattern: "**/*.{md,mdx}"
    }),
    schema: sharedSchema.extend({
        season: z.string().optional(),
        location: z.string().optional()
    })
});

const recipes = defineCollection({
    loader: glob({
        base: "./src/content/recipes",
        pattern: "**/*.{md,mdx}"
    }),
    schema: sharedSchema.extend({
        prepMinutes: z.number().int().nonnegative().optional(),
        cookMinutes: z.number().int().nonnegative().optional(),
        servings: z.string().optional(),
        cuisine: z.string().optional()
    })
});

const films = defineCollection({
    loader: glob({
        base: "./src/content/films",
        pattern: "**/*.{md,mdx}"
    }),
    schema: sharedSchema.extend({
        platform: z.string().optional(),
        videoUrl: z.url().optional(),
        durationMinutes: z.number().positive().optional()
    })
});

export const collections = {
    guides,
    letters,
    essays,
    journal,
    recipes,
    films
};
