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
            y: 78,
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
            y: 17,
            elevation: 4100
        },

        neighbors: ["trailhead", "river"],
        tributaries: ["source"],

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
            y: 50,
            elevation: 2200
        },

        neighbors: [
            "trailhead",
            "headwaters",
            "workshop",
            "table",
            "fire",
            "field",
            "orchard"
        ],

        tributaries: [
            "workshop",
            "table",
            "fire",
            "field",
            "orchard"
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
    }
];

export const placesById = Object.fromEntries(
    places.map((place) => [place.id, place])
) as Record<string, Place>;
