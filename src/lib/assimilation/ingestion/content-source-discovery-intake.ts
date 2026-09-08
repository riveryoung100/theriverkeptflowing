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
    CanonicalContentSourceRecord
} from "./canonical-content-source";

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


export interface ReconciledContentSourceDiscoveryReplay {

    readonly canonical:
        CanonicalContentSourceRecord;

    readonly provenance:
        ContentSourceDiscoveryProvenanceRecord;

}


export interface ContentSourceDiscoveryIntakeResult {

    readonly discovery:
        ContentSourceDiscoveryResult;

    readonly provenance:
        readonly PersistedContentSourceDiscoveryProvenance[];

    readonly ingested:
        readonly PublishedContentSourceIntakeResult[];

    readonly reconciled:
        readonly ReconciledContentSourceDiscoveryReplay[];

}


export interface ContentSourceDiscoveryIntake {

    execute(
        query:
            ContentSourceDiscoveryQuery,
        options?:
            NormalizePublishedContentSourceOptions
    ): Promise<ContentSourceDiscoveryIntakeResult>;

}


function stableCanonicalIdentityMatches(
    existing:
        CanonicalContentSourceRecord,
    preview:
        CanonicalContentSourceRecord
): boolean {

    return (
        existing.sourceId ===
            preview.sourceId &&
        existing.platform ===
            preview.platform &&
        existing.canonicalUrl ===
            preview.canonicalUrl &&
        existing.externalPlatformId ===
            preview.externalPlatformId
    );

}


function stableProvenanceIdentityMatches(
    existing:
        ContentSourceDiscoveryProvenanceRecord,
    expected:
        ContentSourceDiscoveryProvenanceRecord
): boolean {

    return (
        existing.provenanceId ===
            expected.provenanceId &&
        existing.sourceId ===
            expected.sourceId &&
        existing.platform ===
            expected.platform &&
        existing.providerRecordId ===
            expected.providerRecordId &&
        existing.originalSourcePreserved ===
            true
    );

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
            typeof intake.ingest !== "function" ||
            typeof intake.retrieve !== "function"
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

        const reconciled:
            ReconciledContentSourceDiscoveryReplay[] = [];

        for (
            const item of
            prepared
        ) {

            let existingProvenance:
                ContentSourceDiscoveryProvenanceRecord | undefined;

            try {

                existingProvenance =
                    await this.provenancePersistence.retrieve(
                        item.provenanceRecord.provenanceId
                    );

            } catch {

                existingProvenance =
                    undefined;

            }

            if (
                existingProvenance !==
                undefined
            ) {

                if (
                    !stableProvenanceIdentityMatches(
                        existingProvenance,
                        item.provenanceRecord
                    )
                ) {

                    throw new Error(
                        "Existing immutable discovery provenance conflicts with the current discovery identity."
                    );

                }

                let existingCanonical:
                    CanonicalContentSourceRecord;

                try {

                    existingCanonical =
                        await this.intake.retrieve(
                            item.canonicalPreview.sourceId
                        );

                } catch {

                    throw new Error(
                        "Existing discovery provenance has no matching canonical River source."
                    );

                }

                if (
                    !stableCanonicalIdentityMatches(
                        existingCanonical,
                        item.canonicalPreview
                    )
                ) {

                    throw new Error(
                        "Existing canonical River source conflicts with the current discovery identity."
                    );

                }

                reconciled.push(
                    {
                        canonical:
                            existingCanonical,

                        provenance:
                            existingProvenance
                    }
                );

                continue;

            }

            let existingCanonical:
                CanonicalContentSourceRecord | undefined;

            try {

                existingCanonical =
                    await this.intake.retrieve(
                        item.canonicalPreview.sourceId
                    );

            } catch {

                existingCanonical =
                    undefined;

            }

            if (
                existingCanonical !==
                undefined
            ) {

                throw new Error(
                    "Existing canonical River source has no matching immutable discovery provenance."
                );

            }

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
            ingested,
            reconciled
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
