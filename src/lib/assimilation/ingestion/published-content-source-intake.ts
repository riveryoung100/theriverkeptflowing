import {
    normalizePublishedContentSource,
    type NormalizePublishedContentSourceOptions,
    type PublishedContentSourceInput
} from "./content-source-normalization";

import type {
    CanonicalContentSourceRecord
} from "./canonical-content-source";

import type {
    CanonicalContentSourcePersistence
} from "../persistence/canonical-content-source-filesystem";


export interface PublishedContentSourceIntakeResult {

    readonly record:
        CanonicalContentSourceRecord;

    readonly storedPath:
        string;

}


export interface PublishedContentSourceIntake {

    ingest(
        input:
            PublishedContentSourceInput,
        options?:
            NormalizePublishedContentSourceOptions
    ): Promise<PublishedContentSourceIntakeResult>;

    retrieve(
        sourceId:
            string
    ): Promise<CanonicalContentSourceRecord>;

}


export class GovernedPublishedContentSourceIntake
implements PublishedContentSourceIntake {

    public constructor(
        private readonly persistence:
            CanonicalContentSourcePersistence
    ) {

        if (
            !persistence ||
            typeof persistence.persist !== "function" ||
            typeof persistence.retrieve !== "function"
        ) {

            throw new TypeError(
                "Published content source intake requires canonical source persistence."
            );

        }

    }


    public async ingest(
        input:
            PublishedContentSourceInput,
        options:
            NormalizePublishedContentSourceOptions = {}
    ): Promise<PublishedContentSourceIntakeResult> {

        const record =
            normalizePublishedContentSource(
                input,
                options
            );

        const storedPath =
            await this.persistence.persist(
                record
            );

        return {
            record,
            storedPath
        };

    }


    public async retrieve(
        sourceId:
            string
    ): Promise<CanonicalContentSourceRecord> {

        return this.persistence.retrieve(
            sourceId
        );

    }

}


export function createGovernedPublishedContentSourceIntake(
    persistence:
        CanonicalContentSourcePersistence
): PublishedContentSourceIntake {

    return new GovernedPublishedContentSourceIntake(
        persistence
    );

}
