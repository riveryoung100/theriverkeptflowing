import assert from "node:assert/strict";
import test from "node:test";

import {
  sampleTextAsset,
  sampleTextClassification,
  sampleTextSegment,
} from "../assimilation/fixtures/sampleTextAsset";

import { sampleDerivationResult } from "../assimilation/derivation/fixtures/sampleDerivation";

import {
  createKnowledgeNodeIdFromAssimilation,
  createKnowledgeProvenanceFromAssimilation,
  createKnowledgeRequestFromAssimilation,
} from "./assimilationKnowledgeMapper";

const input = {
  asset: sampleTextAsset,

  segment: sampleTextSegment,

  classification: sampleTextClassification,

  derivedObject: sampleDerivationResult.results[0]!.derivative,
};

test("maps assimilation lineage into knowledge provenance", () => {
  const provenance = createKnowledgeProvenanceFromAssimilation(input);

  assert.deepEqual(provenance.sources[0], {
    assetId: sampleTextAsset.id,

    derivativeId: sampleDerivationResult.results[0]!.derivative.id,

    segmentIds: [sampleTextSegment.id],

    classificationIds: [sampleTextClassification.id],

    transformationIds: [
      sampleDerivationResult.results[0]!.derivative.transformationId,
    ],
  });
});

test("creates deterministic branded knowledge node id", () => {
  assert.equal(
    createKnowledgeNodeIdFromAssimilation(
      sampleDerivationResult.results[0]!.derivative,
    ),
    `knowledge:${sampleDerivationResult.results[0]!.derivative.objectId}`,
  );
});

test("creates deterministic knowledge engine request", () => {
  const first = createKnowledgeRequestFromAssimilation(input);

  const second = createKnowledgeRequestFromAssimilation(input);

  assert.deepEqual(first, second);

  assert.equal(first.nodes.length, 1);

  assert.equal(first.relations.length, 0);

  assert.equal(first.claims.length, 0);

  assert.equal(first.revisions.length, 0);

  assert.equal(
    first.nodes[0]?.id,
    `knowledge:${sampleDerivationResult.results[0]!.derivative.objectId}`,
  );

  assert.equal(
    first.nodes[0]?.canonicalName,
    sampleTextAsset.title ??
      sampleDerivationResult.results[0]!.derivative.objectId,
  );

  assert.deepEqual(
    first.nodes[0]?.topicKeys,
    sampleTextClassification.topicKeys,
  );

  assert.deepEqual(
    first.nodes[0]?.domainKeys,
    sampleTextClassification.domainKeys,
  );

  assert.deepEqual(
    first.nodes[0]?.audienceKeys,
    sampleTextClassification.audienceKeys,
  );
});
