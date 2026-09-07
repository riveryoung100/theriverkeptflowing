import {
    acquireContentTranscript,
    type ContentTranscriptAcquisitionProvider,
    type ContentTranscriptAcquisitionRequest,
    type ContentTranscriptAcquisitionResult
} from "./content-transcript-acquisition-provider";

import {
    createContentTranscriptRecord,
    type ContentTranscriptRecord
} from "./content-transcript-record";

import type {
    ContentTranscriptPersistence
} from "../persistence/content-transcript-filesystem";


export interface ContentTranscriptIntakeOptions {

    readonly now?:
        string;

}


export interface ContentTranscriptIntakeResult {

    readonly acquisition:
        ContentTranscriptAcquisitionResult;

    readonly record:
        ContentTranscriptRecord;

    readonly storedPath:
        string;

}


export interface ContentTranscriptIntake {

    ingest(
        request:
            ContentTranscriptAcquisitionRequest,
        options?:
            ContentTranscriptIntakeOptions
    ): Promise<ContentTranscriptIntakeResult>;

}


export class GovernedContentTranscriptIntake
implements ContentTranscriptIntake {

    public constructor(
        private readonly provider:
            ContentTranscriptAcquisitionProvider,
        private readonly persistence:
            ContentTranscriptPersistence
    ) {

        if (
            !provider ||
            typeof provider !== "object"
        ) {

            throw new TypeError(
                "Transcript intake requires an acquisition provider."
            );

        }

        if (
            !persistence ||
            typeof persistence !== "object" ||
            typeof persistence.persist !== "function" ||
            typeof persistence.retrieve !== "function"
        ) {

            throw new TypeError(
                "Transcript intake requires transcript persistence."
            );

        }

    }


    public async ingest(
        request:
            ContentTranscriptAcquisitionRequest,
        options:
            ContentTranscriptIntakeOptions = {}
    ): Promise<ContentTranscriptIntakeResult> {

        const acquisition =
            await acquireContentTranscript(
                this.provider,
                request
            );

        const record =
            createContentTranscriptRecord(
                acquisition,
                {
                    ...(
                        options.now
                            ? {
                                now:
                                    options.now
                            }
                            : {}
                    )
                }
            );

        const storedPath =
            await this.persistence.persist(
                record
            );

        return {
            acquisition,
            record,
            storedPath
        };

    }

}


export function createGovernedContentTranscriptIntake(
    provider:
        ContentTranscriptAcquisitionProvider,
    persistence:
        ContentTranscriptPersistence
): ContentTranscriptIntake {

    return new GovernedContentTranscriptIntake(
        provider,
        persistence
    );

}
