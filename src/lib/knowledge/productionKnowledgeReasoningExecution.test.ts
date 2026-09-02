import assert from "node:assert/strict";
import test from "node:test";

import {
  sampleKnowledgeGraph,
} from "./fixtures/sampleKnowledge";

import {
  sampleSupportPathRequest,
} from "./reasoning/fixtures/sampleReasoning";

import {
  createKnowledgeReasoningEngine,
} from "./reasoning";

import {
  createProductionKnowledgeReasoningExecution,
} from "./productionKnowledgeReasoningExecution";

import type {
  KnowledgeGraph,
} from "./types";

import type {
  KnowledgeReasoningEngine,
  KnowledgeReasoningRequest,
  KnowledgeReasoningResult,
} from "./reasoning";

test(
  "retrieves the exact durable graph and executes the exact caller reasoning request",
  async () => {
    const persistenceKey =
      "knowledge-reasoning-production-test";

    let retrievalCalls = 0;
    let reasoningCalls = 0;
    let capturedKey:
      string | undefined;
    let capturedGraph:
      KnowledgeGraph | undefined;
    let capturedRequest:
      KnowledgeReasoningRequest | undefined;

    const persistence = {
      async retrieve(
        key: string,
      ): Promise<KnowledgeGraph> {
        retrievalCalls += 1;
        capturedKey = key;
        return sampleKnowledgeGraph;
      },
    };

    const expected =
      createKnowledgeReasoningEngine()
        .reason(
          sampleKnowledgeGraph,
          sampleSupportPathRequest,
        );

    const reasoningEngine:
    KnowledgeReasoningEngine = {
      reason(
        graph: KnowledgeGraph,
        request: KnowledgeReasoningRequest,
      ): KnowledgeReasoningResult {
        reasoningCalls += 1;
        capturedGraph = graph;
        capturedRequest = request;
        return expected;
      },
    };

    const actual =
      await createProductionKnowledgeReasoningExecution()
        .execute(
          persistenceKey,
          sampleSupportPathRequest,
          persistence,
          reasoningEngine,
        );

    assert.equal(retrievalCalls, 1);
    assert.equal(reasoningCalls, 1);
    assert.equal(capturedKey, persistenceKey);
    assert.equal(capturedGraph, sampleKnowledgeGraph);
    assert.equal(
      capturedRequest,
      sampleSupportPathRequest,
    );
    assert.equal(actual, expected);
  },
);

test(
  "does not execute reasoning when durable graph retrieval fails",
  async () => {
    let reasoningCalls = 0;
    const retrievalFailure =
      new Error("durable knowledge retrieval failed");

    const persistence = {
      async retrieve(): Promise<KnowledgeGraph> {
        throw retrievalFailure;
      },
    };

    const reasoningEngine:
    KnowledgeReasoningEngine = {
      reason(): KnowledgeReasoningResult {
        reasoningCalls += 1;
        throw new Error("reasoning must not execute");
      },
    };

    await assert.rejects(
      () =>
        createProductionKnowledgeReasoningExecution()
          .execute(
            "knowledge-reasoning-production-test",
            sampleSupportPathRequest,
            persistence,
            reasoningEngine,
          ),
      (error: unknown) =>
        error === retrievalFailure,
    );

    assert.equal(reasoningCalls, 0);
  },
);

test(
  "propagates reasoning failure unchanged after one successful durable retrieval",
  async () => {
    let retrievalCalls = 0;
    let reasoningCalls = 0;
    const reasoningFailure =
      new Error("knowledge reasoning failed");

    const persistence = {
      async retrieve(): Promise<KnowledgeGraph> {
        retrievalCalls += 1;
        return sampleKnowledgeGraph;
      },
    };

    const reasoningEngine:
    KnowledgeReasoningEngine = {
      reason(): KnowledgeReasoningResult {
        reasoningCalls += 1;
        throw reasoningFailure;
      },
    };

    await assert.rejects(
      () =>
        createProductionKnowledgeReasoningExecution()
          .execute(
            "knowledge-reasoning-production-test",
            sampleSupportPathRequest,
            persistence,
            reasoningEngine,
          ),
      (error: unknown) =>
        error === reasoningFailure,
    );

    assert.equal(retrievalCalls, 1);
    assert.equal(reasoningCalls, 1);
  },
);
