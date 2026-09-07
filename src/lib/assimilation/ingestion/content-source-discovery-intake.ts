import {
    discoverPublishedContentSources,
    type ContentSourceDiscoveryProvider,
    type ContentSourceDiscoveryQuery,
    type ContentSourceDiscoveryResult
} from "./content-source-discovery-provider";

import type {
    NormalizePublishedContentSourceOptions
} from "./content-source-normalization";

import type {
    PublishedContentSourceIntake,
    PublishedContentSourceIntakeResult
} from "./published-content-source-intake";


export interface ContentSourceDiscoveryIntakeResult {

    readonly discovery:
        ContentSourceDiscoveryResult;

    readonly ingested:
        readonly PublishedContentSourceIntakeResult[];

}


export interface ContentSourceDiscoveryIntake {

    execute(
        query:
            ContentSourceDiscoveryQuery,
        options?:
            NormalizePublishedContentSourceOptions
    ): Promise<ContentSourceDiscoveryIntakeResult>;

}


export class GovernedContentSourceDiscoveryIntake
implements ContentSourceDiscoveryIntake {

    public constructor(
        private readonly provider:
            ContentSourceDiscoveryProvider,
        private readonly intake:
            PublishedContentSourceIntake
    ) {

        if (
            !provider ||
            typeof provider !== "object" ||
            typeof provider.discover !== "function"
        ) {

            throw new TypeError(
                "Discovery-to-intake orchestration requires a discovery provider."
            );

        }

        if (
            !intake ||
            typeof intake !== "object" ||
            typeof intake.ingest !== "function"
        ) {

            throw new TypeError(
                "Discovery-to-intake orchestration requires governed published source intake."
            );

        }

    }


    public async execute(
        query:
            ContentSourceDiscoveryQuery,
        options:
            NormalizePublishedContentSourceOptions = {}
    ): Promise<ContentSourceDiscoveryIntakeResult> {

        const discovery =
            await discoverPublishedContentSources(
                this.provider,
                query
            );

        const ingested:
            PublishedContentSourceIntakeResult[] = [];

        for (
            const discovered of
            discovery.sources
        ) {

            const result =
                await this.intake.ingest(
                    discovered.source,
                    options
                );

            ingested.push(
                result
            );

        }

        return {
            discovery,
            ingested
        };

    }

}


export function createGovernedContentSourceDiscoveryIntake(
    provider:
        ContentSourceDiscoveryProvider,
    intake:
        PublishedContentSourceIntake
): ContentSourceDiscoveryIntake {

    return new GovernedContentSourceDiscoveryIntake(
        provider,
        intake
    );

}
