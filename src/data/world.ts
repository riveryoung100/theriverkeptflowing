export type WorldCoordinates = {
    x: number;
    y: number;
    elevation: number;
};

export type PlaceEnvironment = {
    biome: string;
    waterCharacter: string;
    vegetation: string[];
    wildlife: string[];
    materials: string[];
};

export type PlaceAtmosphere = {
    defaultTime: string;
    soundscape: string;
    motionProfile: string;
    weatherProfile: string;
};

export type PlaceTransitions = {
    arrival: string;
    departure: string;
};

export type PlaceVisibility = {
    mapLevel: number;
    hidden: boolean;
    recognitionCondition?: string;
};

export type Place = {
    id: string;
    name: string;
    path: string;
    region: string;
    purpose: string;
    emotionalTone: string[];

    coordinates: WorldCoordinates;

    neighbors: string[];
    tributaries: string[];

    environment: PlaceEnvironment;
    atmosphere: PlaceAtmosphere;
    transitions: PlaceTransitions;
    visibility: PlaceVisibility;
};
