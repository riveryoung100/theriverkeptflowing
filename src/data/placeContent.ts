export type PlaceContent = {
    eyebrow: string;
    description: string;
    purpose: string;
    status?: string;
};

export const placeContent: Record<string, PlaceContent> = {
    field: {
        eyebrow: "Strength, practice, and formation",
        description:
            "Explore physical stewardship through strength, movement, recovery, discipline, health, and sustainable training.",
        purpose:
            "The Field exists to cultivate strength without vanity, discipline without destruction, and physical ability that serves a meaningful life."
    },

    fire: {
        eyebrow: "Faith, testing, and transformation",
        description:
            "Gather around reflections on God, character, suffering, obedience, refinement, conviction, and spiritual formation.",
        purpose:
            "The Fire holds the teachings and testimonies formed through pressure—the truths that remain after comfort, pride, and illusion burn away."
    },

    guides: {
        eyebrow: "Practical knowledge for the journey",
        description:
            "Read clear, thorough resources designed to help people understand important subjects and make wiser decisions.",
        purpose:
            "River Guides translate complex subjects into practical understanding, beginning with insurance and expanding into every area where clarity can protect and equip people."
    },

    headwaters: {
        eyebrow: "Origins and first principles",
        description:
            "Return to the beginning: faith, identity, calling, first principles, and the Source from which the rest of the river flows.",
        purpose:
            "Headwaters preserves the deepest foundations of the work—the beliefs, experiences, questions, and convictions that shape everything downstream."
    },

    journal: {
        eyebrow: "A record of the unfolding journey",
        description:
            "Read dated reflections, observations, discoveries, turning points, and honest records from life as it is being lived.",
        purpose:
            "The Journal preserves the immediate record before hindsight reshapes it—the questions, realizations, and moments that reveal how a life actually changes."
    },

    marketplace: {
        eyebrow: "Exchange in service of the mission",
        description:
            "Discover services, products, partnerships, recommendations, and ways to support the work and its service to the community.",
        purpose:
            "The Marketplace connects ethical commerce with meaningful provision, allowing useful work to sustain the family, the platform, and the ministry flowing through it."
    },

    orchard: {
        eyebrow: "Growth, provision, and legacy",
        description:
            "Explore work that grows slowly: stewardship, family provision, long-term thinking, cultivation, multiplication, and inheritance.",
        purpose:
            "The Orchard represents patient work whose fruit may feed people beyond the person who planted it."
    },

    river: {
        eyebrow: "The continuing current",
        description:
            "Enter the central current of reflections, films, stories, lessons, and ordinary life as it continues to unfold.",
        purpose:
            "The River holds the living record of the journey: what is being learned, endured, built, released, and carried forward."
    },

    table: {
        eyebrow: "Food, family, and fellowship",
        description:
            "Find recipes, traditions, shared meals, hospitality, family nourishment, and the wisdom carried through ordinary kitchens.",
        purpose:
            "The Table exists to nourish real homes and preserve the meals, memories, techniques, and traditions that gather people together."
    },

    workshop: {
        eyebrow: "Skills, systems, and useful work",
        description:
            "Enter the practical place where websites, businesses, tools, systems, services, and durable skills are built.",
        purpose:
            "The Workshop documents useful craftsmanship—the knowledge and systems required to turn ideas into work that genuinely serves people."
    }
};
