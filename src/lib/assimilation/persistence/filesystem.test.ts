import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createExtractionEngine, InMemoryRawSourceReader } from "../extraction/engine";
import { sampleTextAsset } from "../fixtures/sampleTextAsset";
import { createAssetId } from "../identifiers";
import { createAssimilationPipeline } from "../pipeline/engine";
import type { AssetId, SourceAsset, StorageReference } from "../types";
import { createFileSystemAssimilationGeneratedRecordPersistence } from "./filesystem";

const storage: StorageReference = { provider: "memory", bucket: "raw", key: "persistence-source.txt", versionId: "v1" };
const asset: SourceAsset = { ...sampleTextAsset, storage };

async function createRecords() {
    const extractionEngine = createExtractionEngine(new InMemoryRawSourceReader([{ storage, text: "Faith, family, purpose, stewardship, and legacy." }]));
    const result = await createAssimilationPipeline(extractionEngine).assimilate(asset);
    assert.equal(result.status, "completed");
    assert.ok(result.extraction);
    assert.ok(result.segment);
    assert.ok(result.classification);
    assert.ok(result.transformation);
    assert.ok(result.derivedObject);
    return { asset: result.asset, extraction: result.extraction, segment: result.segment, classification: result.classification, transformation: result.transformation, derivedObject: result.derivedObject };
}

test("persists the complete generated record set with exact identities and round-trip data", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-persistence-"));
    try {
        const records = await createRecords();
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        const storedPath = await persistence.persist(records);
        assert.equal(storedPath, join(root, "generated-records", `${encodeURIComponent(records.asset.id)}.json`));
        const stored = JSON.parse(await readFile(storedPath, "utf8"));
        assert.deepEqual(stored, records);
        assert.equal(stored.asset.id, records.asset.id);
        assert.equal(stored.extraction.id, records.extraction.id);
        assert.equal(stored.segment.id, records.segment.id);
        assert.equal(stored.classification.id, records.classification.id);
        assert.equal(stored.transformation.id, records.transformation.id);
        assert.equal(stored.derivedObject.id, records.derivedObject.id);
        assert.equal(stored.transformation.outputObjectIds[0], records.derivedObject.id);
        assert.equal(stored.derivedObject.transformationId, records.transformation.id);
        assert.deepEqual(stored.derivedObject.sourceClassificationIds, [records.classification.id]);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("keeps generated records physically separate from raw-source storage", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-persistence-"));
    try {
        const records = await createRecords();
        const storedPath = await createFileSystemAssimilationGeneratedRecordPersistence(root).persist(records);
        assert.equal(storedPath.startsWith(join(root, "generated-records")), true);
        assert.equal(storedPath.includes(join(root, "raw")), false);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("fails closed rather than overwriting an existing durable record identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-persistence-"));
    try {
        const records = await createRecords();
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        const storedPath = await persistence.persist(records);
        const before = await readFile(storedPath, "utf8");
        await assert.rejects(() => persistence.persist(records));
        assert.equal(await readFile(storedPath, "utf8"), before);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("contains traversal-shaped asset identities inside generated-record storage", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-persistence-"));
    try {
        const records = await createRecords();
        const hostile = { ...records, asset: { ...records.asset, id: "asset:../../outside" as AssetId } };
        const storedPath = await createFileSystemAssimilationGeneratedRecordPersistence(root).persist(hostile);
        assert.equal(storedPath, join(root, "generated-records", `${encodeURIComponent(hostile.asset.id)}.json`));
        await access(storedPath);
        await assert.rejects(() => access(join(root, "outside.json")));
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("retrieves the complete durable generated record set without mutating it", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-retrieval-"));
    try {
        const records = await createRecords();
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        const storedPath = await persistence.persist(records);
        const before = await readFile(storedPath, "utf8");
        const retrieved = await persistence.retrieve(records.asset.id);
        assert.deepEqual(retrieved, records);
        assert.equal(await readFile(storedPath, "utf8"), before);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("fails closed when a durable generated record does not exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-retrieval-"));
    try {
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        await assert.rejects(() => persistence.retrieve("asset:missing" as AssetId));
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("fails closed when durable generated-record JSON is malformed", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-retrieval-"));
    try {
        const records = await createRecords();
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        const storedPath = await persistence.persist(records);
        await writeFile(storedPath, "{malformed", "utf8");
        await assert.rejects(() => persistence.retrieve(records.asset.id), /malformed JSON/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("fails closed when a persisted generated record has an invalid schema version", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-retrieval-"));
    try {
        const records = await createRecords();
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        const storedPath = await persistence.persist(records);
        const corrupted = { ...records, transformation: { ...records.transformation, schemaVersion: "0.0.0" } };
        await writeFile(storedPath, JSON.stringify(corrupted), "utf8");
        await assert.rejects(() => persistence.retrieve(records.asset.id), /transformation record failed validation/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("fails closed when the requested asset identity differs from the persisted bundle identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-retrieval-"));
    try {
        const records = await createRecords();
        const requestedAssetId = createAssetId();
        assert.notEqual(requestedAssetId, records.asset.id);
        const targetPath = join(root, "generated-records", `${encodeURIComponent(requestedAssetId)}.json`);
        await mkdir(join(root, "generated-records"), { recursive: true });
        await writeFile(targetPath, JSON.stringify(records), "utf8");
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        await assert.rejects(() => persistence.retrieve(requestedAssetId), /inconsistent identity or provenance links/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("fails closed when derived-object classification provenance is inconsistent", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-retrieval-"));
    try {
        const records = await createRecords();
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        const storedPath = await persistence.persist(records);
        const corrupted = { ...records, derivedObject: { ...records.derivedObject, sourceClassificationIds: [] } };
        await writeFile(storedPath, JSON.stringify(corrupted), "utf8");
        await assert.rejects(() => persistence.retrieve(records.asset.id), /inconsistent identity or provenance links/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("fails closed when transformation and derived-object provenance are inconsistent", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-retrieval-"));
    try {
        const records = await createRecords();
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        const storedPath = await persistence.persist(records);
        const corrupted = { ...records, transformation: { ...records.transformation, outputObjectIds: [] } };
        await writeFile(storedPath, JSON.stringify(corrupted), "utf8");
        await assert.rejects(() => persistence.retrieve(records.asset.id), /inconsistent identity or provenance links/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("contains traversal-shaped retrieval identities and remains read-only", async () => {
    const root = await mkdtemp(join(tmpdir(), "assimilation-retrieval-"));
    try {
        const records = await createRecords();
        const hostileAssetId = "asset:../../outside" as AssetId;
        const hostile = {
            ...records,
            asset: { ...records.asset, id: hostileAssetId },
            extraction: { ...records.extraction, assetId: hostileAssetId },
            segment: { ...records.segment, assetId: hostileAssetId },
            classification: { ...records.classification, assetId: hostileAssetId },
            derivedObject: { ...records.derivedObject, assetId: hostileAssetId }
        };
        const persistence = createFileSystemAssimilationGeneratedRecordPersistence(root);
        const storedPath = await persistence.persist(hostile);
        const before = await readFile(storedPath, "utf8");
        await assert.rejects(() => persistence.retrieve(hostileAssetId), /valid asset identifier/);
        assert.equal(await readFile(storedPath, "utf8"), before);
        await assert.rejects(() => access(join(root, "outside.json")));
    } finally { await rm(root, { recursive: true, force: true }); }
});
