import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const sharedSchema = z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().default("River Young"),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional()
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
        readingMinutes: z.number().int().positive().optional()
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
        readingMinutes: z.number().int().positive().optional()
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
        videoUrl: z.string().url().optional(),
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
