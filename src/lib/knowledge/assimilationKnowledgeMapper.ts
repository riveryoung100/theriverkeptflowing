import { createHash } from "node:crypto";

import type {
  AssetClassification,
  AssetSegment,
  DerivedObjectReference,
  SourceAsset,
} from "../assimilation/types";

import { KNOWLEDGE_SCHEMA_VERSION } from "./types";

import type {
  KnowledgeEngineRequest,
  KnowledgeNode,
  KnowledgeNodeId,
  KnowledgeProvenance,
} from "./types";

export interface AssimilationKnowledgeInput {
  readonly asset: SourceAsset;

  readonly segment: AssetSegment;

  readonly classification: AssetClassification;

  readonly derivedObject: DerivedObjectReference;
}

export function createKnowledgeNodeIdFromAssimilation(
  derivedObject: DerivedObjectReference,
): KnowledgeNodeId {
  const hash = createHash("sha256")
    .update(derivedObject.id)
    .digest("hex");

  const uuid =
    `${hash.slice(0, 8)}-` +
    `${hash.slice(8, 12)}-` +
    `4${hash.slice(13, 16)}-` +
    `8${hash.slice(17, 20)}-` +
    `${hash.slice(20, 32)}`;

  return `knowledge:${uuid}` as KnowledgeNodeId;
}

export function createKnowledgeProvenanceFromAssimilation(
  input: AssimilationKnowledgeInput,
): KnowledgeProvenance {
  return {
    sources: [
      {
        assetId: input.asset.id,

        derivativeId: input.derivedObject.id,

        segmentIds: [input.segment.id],

        classificationIds: [input.classification.id],

        transformationIds: [input.derivedObject.transformationId],
      },
    ],

    createdAt: input.classification.classifiedAt,

    createdBy: "assimilation-pipeline",
  };
}

export function createKnowledgeRequestFromAssimilation(
  input: AssimilationKnowledgeInput,
): KnowledgeEngineRequest {
  const provenance = createKnowledgeProvenanceFromAssimilation(input);

  const node: KnowledgeNode = {
    id: createKnowledgeNodeIdFromAssimilation(input.derivedObject),

    nodeType: "other",

    canonicalName: input.asset.title ?? input.derivedObject.objectId,

    aliases: [],

    topicKeys: [...input.classification.topicKeys],

    domainKeys: [...input.classification.domainKeys],

    audienceKeys: [...input.classification.audienceKeys],

    visibility: "internal",

    status: "draft",

    reviewStatus: "pending",

    provenance,

    version: 1,

    schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
  };

  return {
    nodes: [node],

    relations: [],

    claims: [],

    revisions: [],
  };
}
