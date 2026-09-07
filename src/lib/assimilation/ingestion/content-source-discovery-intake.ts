import {
    discoverPublishedContentSources,
    type ContentSourceDiscoveryProvider,
    type ContentSourceDiscoveryQuery,
    type ContentSourceDiscoveryResult
} from "./content-source-discovery-provider";

import {
    normalizePublishedContentSource,
    type NormalizePublishedContentSourceOptions
} from "./content-source-normalization";

import {
    createContentSourceDiscoveryProvenanceRecord,
    type ContentSourceDiscoveryProvenanceRecord
} from "./content-source-discovery-provenance";

import type {
    PublishedContentSourceIntake,
    PublishedContentSourceIntakeResult
} from "./published-content-source-intake";

import type {
    ContentSourceDiscoveryProvenancePersistence
} from "../persistence/content-source-discovery-provenance-filesystem";


export interface PersistedContentSourceDiscoveryProvenance {

    readonly record:
        ContentSourceDiscoveryProvenanceRecord;

    readonly storedPath:
        string;

}


export interface ContentSourceDiscoveryIntakeResult {

    readonly discovery:
        ContentSourceDiscoveryResult;

    readonly provenance:
        readonly PersistedContentSourceDiscoveryProvenance[];

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
            PublishedContentSourceIntake,

        private readonly provenancePersistence:
            ContentSourceDiscoveryProvenancePersistence
    ) {

        if (
            !provider ||
            typeof provider.discover !== "function"
        ) {

            throw new TypeError(
                "Content source discovery intake requires a discovery provider."
            );

        }

        if (
            !intake ||
            typeof intake.ingest !== "function"
        ) {

            throw new TypeError(
                "Content source discovery intake requires governed published-source intake."
            );

        }

        if (
            !provenancePersistence ||
            typeof provenancePersistence.persist !== "function" ||
            typeof provenancePersistence.retrieve !== "function"
        ) {

            throw new TypeError(
                "Content source discovery intake requires discovery provenance persistence."
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

        /*
         * Pre-normalize the complete batch before any persistence.
         * This establishes deterministic River source identities and
         * ensures malformed source input cannot create partial durable state.
         */
        const prepared =
            discovery.sources.map(
                (discovered) => {

                    const canonicalPreview =
                        normalizePublishedContentSource(
                            discovered.source,
                            options
                        );

                    const provenanceRecord =
                        createContentSourceDiscoveryProvenanceRecord(
                            {
                                sourceId:
                                    canonicalPreview.sourceId,

                                platform:
                                    canonicalPreview.platform,

                                providerRecordId:
                                    discovered.providerRecordId,

                                discoveredAt:
                                    discovered.discoveredAt,

                                ...(
                                    discovered.providerMetadata === undefined
                                        ? {}
                                        : {
                                            providerMetadata:
                                                discovered.providerMetadata
                                        }
                                )
                            },
                            {
                                ...(
                                    options.now === undefined
                                        ? {}
                                        : {
                                            now:
                                                options.now
                                        }
                                )
                            }
                        );

                    return {
                        discovered,
                        canonicalPreview,
                        provenanceRecord
                    };

                }
            );

        const provenance:
            PersistedContentSourceDiscoveryProvenance[] = [];

        const ingested:
            PublishedContentSourceIntakeResult[] = [];

        for (
            const item of
            prepared
        ) {

            /*
             * Preserve the provider observation before canonical persistence.
             * If canonical persistence subsequently fails, the immutable
             * discovery evidence remains available for diagnosis/recovery.
             */
            const provenanceStoredPath =
                await this.provenancePersistence.persist(
                    item.provenanceRecord
                );

            provenance.push(
                {
                    record:
                        item.provenanceRecord,

                    storedPath:
                        provenanceStoredPath
                }
            );

            const result =
                await this.intake.ingest(
                    item.discovered.source,
                    options
                );

            if (
                result.record.sourceId !==
                item.canonicalPreview.sourceId
            ) {

                throw new Error(
                    "Governed source intake produced a canonical identity different from the prevalidated discovery identity."
                );

            }

            ingested.push(
                result
            );

        }

        return {
            discovery,
            provenance,
            ingested
        };

    }

}


export function createGovernedContentSourceDiscoveryIntake(
    provider:
        ContentSourceDiscoveryProvider,
    intake:
        PublishedContentSourceIntake,
    provenancePersistence:
        ContentSourceDiscoveryProvenancePersistence
): ContentSourceDiscoveryIntake {

    return new GovernedContentSourceDiscoveryIntake(
        provider,
        intake,
        provenancePersistence
    );

}
