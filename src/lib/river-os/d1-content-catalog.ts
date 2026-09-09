import type {
    RiverContentCatalogEntry,
    RiverContentTranscriptState
} from "./content-catalog";

import type {
    ContentSourcePlatform,
    ContentSourceStatus
} from "../assimilation/ingestion/canonical-content-source";


interface RiverContentCatalogRow {

    readonly source_id:
        unknown;

    readonly platform:
        unknown;

    readonly canonical_url:
        unknown;

    readonly external_platform_id:
        unknown;

    readonly title:
        unknown;

    readonly description:
        unknown;

    readonly published_at:
        unknown;

    readonly source_status:
        unknown;

    readonly transcript_state:
        unknown;

    readonly transcript_id:
        unknown;

    readonly transcript_persisted_at:
        unknown;

    readonly transcript_provider:
        unknown;

    readonly transcript_language:
        unknown;

    readonly ingested_at:
        unknown;

    readonly updated_at:
        unknown;

    readonly original_source_preserved:
        unknown;

}


export interface RiverContentCatalogPersistence {

    upsert(
        entry:
            RiverContentCatalogEntry
    ): Promise<void>;

    get(
        sourceId:
            string
    ): Promise<RiverContentCatalogEntry | undefined>;

    list(
        limit?:
            number
    ): Promise<readonly RiverContentCatalogEntry[]>;

}


function requireString(
    value:
        unknown,
    field:
        string
): string {

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {

        throw new TypeError(
            `River content catalog ${field} must be a non-empty string.`
        );

    }

    return value;

}


function optionalString(
    value:
        unknown,
    field:
        string
): string | undefined {

    if (
        value === null ||
        value === undefined
    ) {

        return undefined;

    }

    return requireString(
        value,
        field
    );

}


function rowToEntry(
    row:
        RiverContentCatalogRow
): RiverContentCatalogEntry {

    const preserved =
        row.original_source_preserved;

    if (
        preserved !== 1 &&
        preserved !== true
    ) {

        throw new TypeError(
            "River content catalog original source preservation invariant failed."
        );

    }

    const transcriptState =
        requireString(
            row.transcript_state,
            "transcript_state"
        ) as RiverContentTranscriptState;

    if (
        transcriptState !== "pending" &&
        transcriptState !== "available"
    ) {

        throw new TypeError(
            "River content catalog transcript_state is invalid."
        );

    }

    const transcriptId =
        optionalString(
            row.transcript_id,
            "transcript_id"
        );

    const transcriptPersistedAt =
        optionalString(
            row.transcript_persisted_at,
            "transcript_persisted_at"
        );

    if (
        transcriptState === "available" &&
        (
            transcriptId === undefined ||
            transcriptPersistedAt === undefined
        )
    ) {

        throw new TypeError(
            "Available River content catalog transcripts require transcript identity and persistence time."
        );

    }

    return {
        sourceId:
            requireString(
                row.source_id,
                "source_id"
            ),

        platform:
            requireString(
                row.platform,
                "platform"
            ) as ContentSourcePlatform,

        canonicalUrl:
            requireString(
                row.canonical_url,
                "canonical_url"
            ),

        externalPlatformId:
            requireString(
                row.external_platform_id,
                "external_platform_id"
            ),

        title:
            requireString(
                row.title,
                "title"
            ),

        ...(
            optionalString(
                row.description,
                "description"
            ) === undefined
                ? {}
                : {
                    description:
                        String(
                            row.description
                        )
                }
        ),

        publishedAt:
            requireString(
                row.published_at,
                "published_at"
            ),

        sourceStatus:
            requireString(
                row.source_status,
                "source_status"
            ) as ContentSourceStatus,

        transcriptState,

        ...(
            transcriptId === undefined
                ? {}
                : {
                    transcriptId
                }
        ),

        ...(
            transcriptPersistedAt === undefined
                ? {}
                : {
                    transcriptPersistedAt
                }
        ),

        ...(
            optionalString(
                row.transcript_provider,
                "transcript_provider"
            ) === undefined
                ? {}
                : {
                    transcriptProvider:
                        String(
                            row.transcript_provider
                        )
                }
        ),

        ...(
            optionalString(
                row.transcript_language,
                "transcript_language"
            ) === undefined
                ? {}
                : {
                    transcriptLanguage:
                        String(
                            row.transcript_language
                        )
                }
        ),

        ingestedAt:
            requireString(
                row.ingested_at,
                "ingested_at"
            ),

        updatedAt:
            requireString(
                row.updated_at,
                "updated_at"
            ),

        originalSourcePreserved:
            true
    };

}


function requireSourceId(
    sourceId:
        unknown
): asserts sourceId is string {

    if (
        typeof sourceId !== "string" ||
        !sourceId.startsWith(
            "source:"
        ) ||
        sourceId.trim() !==
            sourceId ||
        sourceId.length <=
            "source:".length
    ) {

        throw new TypeError(
            "River content catalog requires a valid source identity."
        );

    }

}


function requireLimit(
    limit:
        number
): void {

    if (
        !Number.isInteger(limit) ||
        limit <= 0 ||
        limit > 100
    ) {

        throw new TypeError(
            "River content catalog list limit must be an integer from 1 through 100."
        );

    }

}


export class D1RiverContentCatalogPersistence
implements RiverContentCatalogPersistence {

    public constructor(
        private readonly database:
            D1Database
    ) {}

    public async upsert(
        entry:
            RiverContentCatalogEntry
    ): Promise<void> {

        requireSourceId(
            entry.sourceId
        );

        if (
            entry.originalSourcePreserved !==
            true
        ) {

            throw new TypeError(
                "River content catalog requires originalSourcePreserved to remain true."
            );

        }

        await this.database
            .prepare(
                `
                    INSERT INTO river_content_catalog (
                        source_id,
                        platform,
                        canonical_url,
                        external_platform_id,
                        title,
                        description,
                        published_at,
                        source_status,
                        transcript_state,
                        transcript_id,
                        transcript_persisted_at,
                        transcript_provider,
                        transcript_language,
                        ingested_at,
                        updated_at,
                        original_source_preserved
                    )
                    VALUES (
                        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
                        ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
                    )
                    ON CONFLICT(source_id)
                    DO UPDATE SET
                        platform = excluded.platform,
                        canonical_url = excluded.canonical_url,
                        external_platform_id = excluded.external_platform_id,
                        title = excluded.title,
                        description = excluded.description,
                        published_at = excluded.published_at,
                        source_status = excluded.source_status,
                        transcript_state = excluded.transcript_state,
                        transcript_id = excluded.transcript_id,
                        transcript_persisted_at = excluded.transcript_persisted_at,
                        transcript_provider = excluded.transcript_provider,
                        transcript_language = excluded.transcript_language,
                        ingested_at = excluded.ingested_at,
                        updated_at = excluded.updated_at,
                        original_source_preserved = excluded.original_source_preserved
                `
            )
            .bind(
                entry.sourceId,
                entry.platform,
                entry.canonicalUrl,
                entry.externalPlatformId,
                entry.title,
                entry.description ?? null,
                entry.publishedAt,
                entry.sourceStatus,
                entry.transcriptState,
                entry.transcriptId ?? null,
                entry.transcriptPersistedAt ?? null,
                entry.transcriptProvider ?? null,
                entry.transcriptLanguage ?? null,
                entry.ingestedAt,
                entry.updatedAt,
                1
            )
            .run();

    }

    public async get(
        sourceId:
            string
    ): Promise<RiverContentCatalogEntry | undefined> {

        requireSourceId(
            sourceId
        );

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM river_content_catalog
                        WHERE source_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    sourceId
                )
                .first<RiverContentCatalogRow>();

        return row === null
            ? undefined
            : rowToEntry(
                row
            );

    }

    public async list(
        limit:
            number = 50
    ): Promise<readonly RiverContentCatalogEntry[]> {

        requireLimit(
            limit
        );

        const result =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM river_content_catalog
                        ORDER BY published_at DESC, source_id ASC
                        LIMIT ?1
                    `
                )
                .bind(
                    limit
                )
                .all<RiverContentCatalogRow>();

        return result.results.map(
            rowToEntry
        );

    }

}


export function createD1RiverContentCatalogPersistence(
    database:
        D1Database
): RiverContentCatalogPersistence {

    return new D1RiverContentCatalogPersistence(
        database
    );

}
