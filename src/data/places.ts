import type { Place } from "./world";

export const places: Place[] = [
    {
        id: "trailhead",
        name: "The Trailhead",
        path: "/",
        region: "threshold-valley",
        purpose: "Arrival, orientation, and the first invitation into the world.",
        emotionalTone: ["arrival", "wonder", "quiet anticipation"],

        coordinates: {
            x: 50,
            y: 86,
            elevation: 1450
        },

        neighbors: ["headwaters", "river"],
        tributaries: [],

        environment: {
            biome: "foothill-river-valley",
            waterCharacter: "distant but increasingly audible",
            vegetation: ["native grasses", "cottonwood", "juniper"],
            wildlife: ["swallow", "dragonfly", "deer"],
            materials: ["stone", "weathered wood", "water"]
        },

        atmosphere: {
            defaultTime: "dawn",
            soundscape: "trailhead-river-distance",
            motionProfile: "slow-awakening",
            weatherProfile: "clear-mist"
        },

        transitions: {
            arrival: "threshold-resolve",
            departure: "follow-the-current"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "headwaters",
        name: "Headwaters",
        path: "/headwaters/",
        region: "northern-highlands",
        purpose: "Origins, faith, first principles, and the Source.",
        emotionalTone: ["clarity", "awakening", "reverence"],

        coordinates: {
            x: 43,
            y: 10,
            elevation: 4100
        },

        neighbors: ["trailhead", "river", "fire"],
        tributaries: ["fire"],

        environment: {
            biome: "highland-spring",
            waterCharacter: "cold, narrow, clear, and quick",
            vegetation: ["pine", "moss", "alpine grass"],
            wildlife: ["swallow", "deer", "trout"],
            materials: ["granite", "pine", "clear water"]
        },

        atmosphere: {
            defaultTime: "morning",
            soundscape: "fast-water-highland-wind",
            motionProfile: "clear-current",
            weatherProfile: "cool-mist"
        },

        transitions: {
            arrival: "mist-opens-to-spring",
            departure: "water-descends"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "river",
        name: "The River",
        path: "/river/",
        region: "central-watershed",
        purpose: "The continuing current of reflections, films, stories, and daily life.",
        emotionalTone: ["continuity", "presence", "movement"],

        coordinates: {
            x: 50,
            y: 48,
            elevation: 2200
        },

        neighbors: [
            "trailhead",
            "headwaters",
            "workshop",
            "table",
            "fire",
            "field",
            "orchard",
            "journal",
            "guides",
            "marketplace"
        ],

        tributaries: [
            "workshop",
            "table",
            "fire",
            "field",
            "orchard",
            "journal",
            "guides",
            "marketplace"
        ],

        environment: {
            biome: "temperate-river-valley",
            waterCharacter: "steady, widening, and reflective",
            vegetation: ["cottonwood", "willow", "native grass"],
            wildlife: ["dragonfly", "trout", "heron"],
            materials: ["river stone", "wood", "water"]
        },

        atmosphere: {
            defaultTime: "afternoon",
            soundscape: "main-current",
            motionProfile: "continuous-flow",
            weatherProfile: "seasonal-valley"
        },

        transitions: {
            arrival: "join-the-current",
            departure: "follow-the-bend"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "field",
        name: "The Field",
        path: "/field/",
        region: "western-grasslands",
        purpose: "Strength, movement, discipline, recovery, and stewardship of the body.",
        emotionalTone: ["strength", "discipline", "renewal"],

        coordinates: {
            x: 18,
            y: 54,
            elevation: 2050
        },

        neighbors: ["river", "workshop", "orchard"],
        tributaries: [],

        environment: {
            biome: "open-grassland",
            waterCharacter: "shallow irrigation channels and distant river sound",
            vegetation: ["prairie grass", "mesquite", "wildflowers"],
            wildlife: ["hawk", "rabbit", "whitetail deer"],
            materials: ["earth", "iron", "timber"]
        },

        atmosphere: {
            defaultTime: "morning",
            soundscape: "grassland-wind",
            motionProfile: "steady-breath",
            weatherProfile: "sun-and-crosswind"
        },

        transitions: {
            arrival: "step-into-open-ground",
            departure: "return-with-strength"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "fire",
        name: "The Fire",
        path: "/fire/",
        region: "highland-clearing",
        purpose: "Faith, formation, conviction, refinement, and the inner life.",
        emotionalTone: ["reverence", "conviction", "warmth"],

        coordinates: {
            x: 72,
            y: 22,
            elevation: 3350
        },

        neighbors: ["headwaters", "river", "journal"],
        tributaries: [],

        environment: {
            biome: "pine-clearing",
            waterCharacter: "a nearby spring heard beyond the trees",
            vegetation: ["pine", "cedar", "fern"],
            wildlife: ["owl", "deer", "fox"],
            materials: ["charred wood", "stone", "embers"]
        },

        atmosphere: {
            defaultTime: "night",
            soundscape: "fire-and-distant-water",
            motionProfile: "ember-breathe",
            weatherProfile: "clear-cold-night"
        },

        transitions: {
            arrival: "embers-emerge",
            departure: "carry-the-light"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "table",
        name: "The Table",
        path: "/table/",
        region: "riverside-homestead",
        purpose: "Food, family, hospitality, nourishment, and shared life.",
        emotionalTone: ["welcome", "gratitude", "belonging"],

        coordinates: {
            x: 70,
            y: 53,
            elevation: 2100
        },

        neighbors: ["river", "orchard", "marketplace"],
        tributaries: [],

        environment: {
            biome: "riverside-homestead",
            waterCharacter: "slow water beside a sheltered bank",
            vegetation: ["herbs", "oak", "garden vegetables"],
            wildlife: ["songbird", "chicken", "butterfly"],
            materials: ["oak", "linen", "clay"]
        },

        atmosphere: {
            defaultTime: "evening",
            soundscape: "kitchen-river-evening",
            motionProfile: "gathering-warmth",
            weatherProfile: "sheltered-seasonal"
        },

        transitions: {
            arrival: "door-opens-to-warmth",
            departure: "leave-nourished"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "orchard",
        name: "The Orchard",
        path: "/orchard/",
        region: "southern-gardens",
        purpose: "Growth, family stewardship, cultivation, patience, and lasting fruit.",
        emotionalTone: ["patience", "hope", "abundance"],

        coordinates: {
            x: 30,
            y: 70,
            elevation: 1800
        },

        neighbors: ["river", "field", "table", "marketplace"],
        tributaries: [],

        environment: {
            biome: "cultivated-river-plain",
            waterCharacter: "narrow channels feeding roots and garden beds",
            vegetation: ["fruit trees", "herbs", "wildflowers"],
            wildlife: ["bee", "dove", "rabbit"],
            materials: ["soil", "wood", "woven basket"]
        },

        atmosphere: {
            defaultTime: "late-afternoon",
            soundscape: "orchard-insects-and-water",
            motionProfile: "seasonal-growth",
            weatherProfile: "warm-breeze"
        },

        transitions: {
            arrival: "rows-come-into-view",
            departure: "carry-the-harvest"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "workshop",
        name: "The Workshop",
        path: "/workshop/",
        region: "western-riverbank",
        purpose: "Craft, websites, systems, business, building, and practical work.",
        emotionalTone: ["focus", "craftsmanship", "possibility"],

        coordinates: {
            x: 23,
            y: 36,
            elevation: 2350
        },

        neighbors: ["river", "field", "guides", "marketplace"],
        tributaries: [],

        environment: {
            biome: "wooded-riverbank",
            waterCharacter: "working current turning beside the bank",
            vegetation: ["oak", "juniper", "river grass"],
            wildlife: ["woodpecker", "beaver", "hawk"],
            materials: ["timber", "iron", "leather"]
        },

        atmosphere: {
            defaultTime: "midday",
            soundscape: "tools-and-running-water",
            motionProfile: "measured-work",
            weatherProfile: "dry-clear-day"
        },

        transitions: {
            arrival: "tools-come-into-focus",
            departure: "work-takes-form"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "guides",
        name: "River Guides",
        path: "/guides/",
        region: "eastern-crossing",
        purpose: "Practical lessons, tools, resources, and guidance for the road ahead.",
        emotionalTone: ["clarity", "readiness", "companionship"],

        coordinates: {
            x: 82,
            y: 39,
            elevation: 2250
        },

        neighbors: ["river", "workshop", "journal", "marketplace"],
        tributaries: [],

        environment: {
            biome: "river-crossing",
            waterCharacter: "divided channels gathering beneath a bridge",
            vegetation: ["willow", "reed", "cottonwood"],
            wildlife: ["heron", "kingfisher", "trout"],
            materials: ["rope", "canvas", "river stone"]
        },

        atmosphere: {
            defaultTime: "morning",
            soundscape: "crossing-water-and-birds",
            motionProfile: "purposeful-passage",
            weatherProfile: "clear-traveling-weather"
        },

        transitions: {
            arrival: "path-markers-appear",
            departure: "continue-equipped"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "journal",
        name: "The Journal",
        path: "/journal/",
        region: "quiet-eastern-bank",
        purpose: "Writings, observations, stories, reflections, and the unfolding record.",
        emotionalTone: ["reflection", "honesty", "attention"],

        coordinates: {
            x: 78,
            y: 67,
            elevation: 1900
        },

        neighbors: ["river", "fire", "guides", "marketplace"],
        tributaries: [],

        environment: {
            biome: "quiet-riverbank",
            waterCharacter: "slow reflective water beneath overhanging branches",
            vegetation: ["willow", "fern", "river grass"],
            wildlife: ["heron", "dragonfly", "dove"],
            materials: ["paper", "ink", "weathered wood"]
        },

        atmosphere: {
            defaultTime: "dusk",
            soundscape: "quiet-bank-and-evening-water",
            motionProfile: "page-turning",
            weatherProfile: "soft-overcast"
        },

        transitions: {
            arrival: "noise-falls-away",
            departure: "close-the-page"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    },

    {
        id: "marketplace",
        name: "The Marketplace",
        path: "/marketplace/",
        region: "southern-river-crossroads",
        purpose: "Products, services, partnerships, support, commerce, and contribution.",
        emotionalTone: ["exchange", "service", "stewardship"],

        coordinates: {
            x: 58,
            y: 78,
            elevation: 1650
        },

        neighbors: [
            "river",
            "workshop",
            "table",
            "orchard",
            "guides",
            "journal"
        ],

        tributaries: [],

        environment: {
            biome: "river-crossroads",
            waterCharacter: "broad current beside a gathering place",
            vegetation: ["shade tree", "herbs", "native grass"],
            wildlife: ["swallow", "horse", "songbird"],
            materials: ["canvas", "wood", "brass"]
        },

        atmosphere: {
            defaultTime: "afternoon",
            soundscape: "crossroads-and-river",
            motionProfile: "measured-exchange",
            weatherProfile: "open-clear-day"
        },

        transitions: {
            arrival: "crossroads-open",
            departure: "continue-with-purpose"
        },

        visibility: {
            mapLevel: 1,
            hidden: false
        }
    }
];

export const placesById = Object.fromEntries(
    places.map((place) => [place.id, place])
) as Record<string, Place>;
