import assert from "node:assert/strict";
import test from "node:test";

import {
  sampleKnowledgeGraph,
} from "./fixtures/sampleKnowledge";

import {
  sampleSearchQuery,
} from "./query/fixtures/sampleQueries";

import {
  createKnowledgeQueryEngine,
} from "./query";

import {
  createProductionKnowledgeQueryExecution,
} from "./productionKnowledgeQueryExecution";

import type {
  KnowledgeGraph,
} from "./types";

import type {
  KnowledgeQueryEngine,
  KnowledgeQueryRequest,
  KnowledgeQueryResult,
} from "./query";

test(
  "retrieves the exact durable graph and executes the exact caller query",
  async () => {
    const persistenceKey =
      "knowledge-query-production-test";

    let retrievalCalls = 0;
    let queryCalls = 0;
    let capturedKey:
      string | undefined;
    let capturedGraph:
      KnowledgeGraph | undefined;
    let capturedRequest:
      KnowledgeQueryRequest | undefined;

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
      createKnowledgeQueryEngine()
        .query(
          sampleKnowledgeGraph,
          sampleSearchQuery,
        );

    const queryEngine:
    KnowledgeQueryEngine = {
      query(
        graph: KnowledgeGraph,
        request: KnowledgeQueryRequest,
      ): KnowledgeQueryResult {
        queryCalls += 1;
        capturedGraph = graph;
        capturedRequest = request;
        return expected;
      },
    };

    const actual =
      await createProductionKnowledgeQueryExecution()
        .execute(
          persistenceKey,
          sampleSearchQuery,
          persistence,
          queryEngine,
        );

    assert.equal(retrievalCalls, 1);
    assert.equal(queryCalls, 1);
    assert.equal(capturedKey, persistenceKey);
    assert.equal(capturedGraph, sampleKnowledgeGraph);
    assert.equal(capturedRequest, sampleSearchQuery);
    assert.equal(actual, expected);
  },
);

test(
  "does not execute a query when durable graph retrieval fails",
  async () => {
    let queryCalls = 0;
    const retrievalFailure =
      new Error("durable knowledge retrieval failed");

    const persistence = {
      async retrieve(): Promise<KnowledgeGraph> {
        throw retrievalFailure;
      },
    };

    const queryEngine:
    KnowledgeQueryEngine = {
      query(): KnowledgeQueryResult {
        queryCalls += 1;
        throw new Error("query must not execute");
      },
    };

    await assert.rejects(
      () =>
        createProductionKnowledgeQueryExecution()
          .execute(
            "knowledge-query-production-test",
            sampleSearchQuery,
            persistence,
            queryEngine,
          ),
      (error: unknown) =>
        error === retrievalFailure,
    );

    assert.equal(queryCalls, 0);
  },
);

test(
  "propagates query failure unchanged after one successful durable retrieval",
  async () => {
    let retrievalCalls = 0;
    let queryCalls = 0;
    const queryFailure =
      new Error("knowledge query failed");

    const persistence = {
      async retrieve(): Promise<KnowledgeGraph> {
        retrievalCalls += 1;
        return sampleKnowledgeGraph;
      },
    };

    const queryEngine:
    KnowledgeQueryEngine = {
      query(): KnowledgeQueryResult {
        queryCalls += 1;
        throw queryFailure;
      },
    };

    await assert.rejects(
      () =>
        createProductionKnowledgeQueryExecution()
          .execute(
            "knowledge-query-production-test",
            sampleSearchQuery,
            persistence,
            queryEngine,
          ),
      (error: unknown) =>
        error === queryFailure,
    );

    assert.equal(retrievalCalls, 1);
    assert.equal(queryCalls, 1);
  },
);
