import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import type {
    AssetClassification,
    AssetExtraction,
    AssetId,
    AssetSegment,
    AssimilationRecordId,
    DerivedObjectReference,
    SourceAsset,
    TransformationRecord
} from "../types";

import {
    isAssetId,
    isClassificationId,
    isDerivativeId,
    isExtractionId,
    isReviewId,
    isSegmentId,
    isTransformationId
} from "../identifiers";

import {
    isConfidence,
    isIsoUtcTimestamp,
    isPositiveInteger,
    validateAssetClassification,
    validateAssetExtraction,
    validateAssetSegment,
    validateSourceAsset
} from "../validation";


export interface AssimilationGeneratedRecordSet {

    readonly asset:
        SourceAsset;

    readonly extraction:
        AssetExtraction;

    readonly segment:
        AssetSegment;

    readonly classification:
        AssetClassification;

    readonly transformation:
        TransformationRecord;

    readonly derivedObject:
        DerivedObjectReference;

}


export interface AssimilationGeneratedRecordPersistence {

    persist(
        records: AssimilationGeneratedRecordSet
    ): Promise<string>;

    retrieve(
        assetId: AssetId
    ): Promise<AssimilationGeneratedRecordSet>;

}


function resolveGeneratedRecordPath(
    rootDirectory: string,
    assetId: string
): string {

    const generatedRoot =
        resolve(
            rootDirectory,
            "generated-records"
        );

    const encodedAssetId =
        encodeURIComponent(assetId);

    const candidate =
        resolve(
            generatedRoot,
            `${encodedAssetId}.json`
        );

    if (
        candidate !== generatedRoot &&
        !candidate.startsWith(
            `${generatedRoot}${sep}`
        )
    ) {

        throw new TypeError(
            "Generated assimilation record path escaped the configured persistence root."
        );
    }

    return candidate;
}


function isObjectRecord(
    value: unknown
): value is Record<string, unknown> {

    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}


function isAssimilationRecordId(
    value: unknown
): value is AssimilationRecordId {

    return (
        isAssetId(value) ||
        isExtractionId(value) ||
        isSegmentId(value) ||
        isClassificationId(value) ||
        isTransformationId(value) ||
        isDerivativeId(value) ||
        isReviewId(value)
    );
}


function assertValidCoreRecord(
    label: string,
    validate: () => { readonly valid: boolean }
): void {

    try {

        if (!validate().valid) {
            throw new TypeError(
                `Persisted assimilation ${label} record failed authoritative validation.`
            );
        }

    } catch (error) {

        if (
            error instanceof TypeError &&
            error.message.startsWith(
                "Persisted assimilation "
            )
        ) {
            throw error;
        }

        throw new TypeError(
            `Persisted assimilation ${label} record is structurally invalid.`
        );
    }
}


function assertActorReference(
    value: unknown
): void {

    if (
        !isObjectRecord(value) ||
        typeof value.type !== "string"
    ) {
        throw new TypeError(
            "Persisted assimilation transformation actor reference is invalid."
        );
    }

    if (
        value.type === "river" ||
        value.type === "staff" ||
        value.type === "system"
    ) {

        if (
            typeof value.id !== "string" ||
            value.id.trim().length === 0
        ) {
            throw new TypeError(
                "Persisted assimilation transformation actor identifier is invalid."
            );
        }

        return;
    }

    if (value.type === "ai") {

        if (
            typeof value.provider !== "string" ||
            value.provider.trim().length === 0 ||
            typeof value.model !== "string" ||
            value.model.trim().length === 0
        ) {
            throw new TypeError(
                "Persisted assimilation transformation AI actor reference is invalid."
            );
        }

        return;
    }

    throw new TypeError(
        "Persisted assimilation transformation actor type is invalid."
    );
}


function assertTransformationRecord(
    value: unknown
): asserts value is TransformationRecord {

    if (!isObjectRecord(value)) {
        throw new TypeError(
            "Persisted assimilation transformation record is invalid."
        );
    }

    const transformationTypes = new Set([
        "transcription",
        "ocr",
        "normalization",
        "segmentation",
        "classification",
        "summary",
        "translation",
        "clip",
        "rewrite",
        "publication",
        "manual-edit"
    ]);

    const tools = new Set([
        "human",
        "system",
        "ai",
        "external-service"
    ]);

    if (
        !isTransformationId(value.id) ||
        !Array.isArray(value.inputObjectIds) ||
        !value.inputObjectIds.every(isAssimilationRecordId) ||
        !Array.isArray(value.outputObjectIds) ||
        !value.outputObjectIds.every(isAssimilationRecordId) ||
        typeof value.transformationType !== "string" ||
        !transformationTypes.has(value.transformationType) ||
        typeof value.tool !== "string" ||
        !tools.has(value.tool) ||
        !isIsoUtcTimestamp(value.createdAt) ||
        !isPositiveInteger(value.version) ||
        value.schemaVersion !== ASSIMILATION_SCHEMA_VERSION
    ) {
        throw new TypeError(
            "Persisted assimilation transformation record failed validation."
        );
    }

    assertActorReference(
        value.createdBy
    );

    if (
        value.instructions !== undefined &&
        typeof value.instructions !== "string"
    ) {
        throw new TypeError(
            "Persisted assimilation transformation instructions are invalid."
        );
    }

    if (
        value.confidence !== undefined &&
        !isConfidence(value.confidence)
    ) {
        throw new TypeError(
            "Persisted assimilation transformation confidence is invalid."
        );
    }

    if (value.toolDetails !== undefined) {

        if (!isObjectRecord(value.toolDetails)) {
            throw new TypeError(
                "Persisted assimilation transformation tool details are invalid."
            );
        }

        for (const key of [
            "provider",
            "model",
            "version"
        ]) {

            const detail =
                value.toolDetails[key];

            if (
                detail !== undefined &&
                typeof detail !== "string"
            ) {
                throw new TypeError(
                    "Persisted assimilation transformation tool details are invalid."
                );
            }
        }
    }
}


function assertDerivedObjectReference(
    value: unknown
): asserts value is DerivedObjectReference {

    if (!isObjectRecord(value)) {
        throw new TypeError(
            "Persisted assimilation derived-object reference is invalid."
        );
    }

    const objectTypes = new Set([
        "knowledge-entry",
        "topic",
        "relationship",
        "claim",
        "learning-outcome",
        "faq",
        "guide-section",
        "article",
        "trail-candidate",
        "internal-sop",
        "content-derivative",
        "other"
    ]);

    const reviewStatuses = new Set([
        "not-required",
        "pending",
        "in-review",
        "approved",
        "approved-with-changes",
        "rejected",
        "blocked"
    ]);

    if (
        !isDerivativeId(value.id) ||
        !isAssetId(value.assetId) ||
        typeof value.objectType !== "string" ||
        !objectTypes.has(value.objectType) ||
        typeof value.objectId !== "string" ||
        value.objectId.trim().length === 0 ||
        !Array.isArray(value.sourceSegmentIds) ||
        !value.sourceSegmentIds.every(isSegmentId) ||
        !Array.isArray(value.sourceClassificationIds) ||
        !value.sourceClassificationIds.every(isClassificationId) ||
        !isTransformationId(value.transformationId) ||
        typeof value.reviewStatus !== "string" ||
        !reviewStatuses.has(value.reviewStatus) ||
        !isIsoUtcTimestamp(value.createdAt) ||
        !isPositiveInteger(value.version) ||
        value.schemaVersion !== ASSIMILATION_SCHEMA_VERSION
    ) {
        throw new TypeError(
            "Persisted assimilation derived-object reference failed validation."
        );
    }
}


function validateRetrievedRecordSet(
    value: unknown,
    requestedAssetId: AssetId
): AssimilationGeneratedRecordSet {

    if (
        !isObjectRecord(value) ||
        !isObjectRecord(value.asset) ||
        !isObjectRecord(value.extraction) ||
        !isObjectRecord(value.segment) ||
        !isObjectRecord(value.classification)
    ) {
        throw new TypeError(
            "Persisted assimilation generated-record bundle is incomplete or malformed."
        );
    }

    assertValidCoreRecord(
        "asset",
        () => validateSourceAsset(
            value.asset as unknown as SourceAsset
        )
    );

    assertValidCoreRecord(
        "extraction",
        () => validateAssetExtraction(
            value.extraction as unknown as AssetExtraction
        )
    );

    assertValidCoreRecord(
        "segment",
        () => validateAssetSegment(
            value.segment as unknown as AssetSegment
        )
    );

    assertValidCoreRecord(
        "classification",
        () => validateAssetClassification(
            value.classification as unknown as AssetClassification
        )
    );

    assertTransformationRecord(
        value.transformation
    );

    assertDerivedObjectReference(
        value.derivedObject
    );

    const records =
        value as unknown as AssimilationGeneratedRecordSet;

    if (
        records.asset.id !== requestedAssetId ||
        records.extraction.assetId !== records.asset.id ||
        records.segment.assetId !== records.asset.id ||
        records.segment.extractionId !== records.extraction.id ||
        records.classification.assetId !== records.asset.id ||
        records.derivedObject.assetId !== records.asset.id ||
        !records.derivedObject.sourceSegmentIds.includes(
            records.segment.id
        ) ||
        !records.derivedObject.sourceClassificationIds.includes(
            records.classification.id
        ) ||
        records.transformation.id !==
            records.derivedObject.transformationId ||
        !records.transformation.inputObjectIds.includes(
            records.classification.id
        ) ||
        !records.transformation.outputObjectIds.includes(
            records.derivedObject.id
        )
    ) {
        throw new TypeError(
            "Persisted assimilation generated-record bundle has inconsistent identity or provenance links."
        );
    }

    return records;
}


export class FileSystemAssimilationGeneratedRecordPersistence
implements AssimilationGeneratedRecordPersistence {

    public constructor(
        private readonly rootDirectory: string
    ) {

        if (
            typeof rootDirectory !== "string" ||
            rootDirectory.trim().length === 0
        ) {

            throw new TypeError(
                "Assimilation generated-record persistence root is required."
            );
        }
    }


    public async persist(
        records: AssimilationGeneratedRecordSet
    ): Promise<string> {

        const targetPath =
            resolveGeneratedRecordPath(
                this.rootDirectory,
                records.asset.id
            );

        const temporaryPath =
            `${targetPath}.tmp`;

        await mkdir(
            dirname(targetPath),
            { recursive: true }
        );

        try {

            await writeFile(
                temporaryPath,
                JSON.stringify(records, null, 2) + "\n",
                "utf8"
            );

            await writeFile(
                targetPath,
                await readFile(temporaryPath),
                { flag: "wx" }
            );

            await rm(
                temporaryPath,
                { force: true }
            );

            return targetPath;

        } catch (error) {

            await rm(
                temporaryPath,
                { force: true }
            );

            throw error;
        }
    }


    public async retrieve(
        assetId: AssetId
    ): Promise<AssimilationGeneratedRecordSet> {

        if (!isAssetId(assetId)) {
            throw new TypeError(
                "Assimilation generated-record retrieval requires a valid asset identifier."
            );
        }

        const targetPath =
            resolveGeneratedRecordPath(
                this.rootDirectory,
                assetId
            );

        const serialized =
            await readFile(
                targetPath,
                "utf8"
            );

        let parsed: unknown;

        try {
            parsed = JSON.parse(
                serialized
            );
        } catch {
            throw new TypeError(
                "Persisted assimilation generated-record bundle contains malformed JSON."
            );
        }

        return validateRetrievedRecordSet(
            parsed,
            assetId
        );
    }

}


export function createFileSystemAssimilationGeneratedRecordPersistence(
    rootDirectory: string
): AssimilationGeneratedRecordPersistence {

    return new FileSystemAssimilationGeneratedRecordPersistence(
        rootDirectory
    );
}
