import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FOOD_DURABLE_RESERVATION_ACCEPTANCE_EVIDENCE_KIND,
  persistFoodDurableReservationAcceptanceEvidence,
  type FoodDurableReservationAcceptanceEvidenceD1Database,
  type FoodDurableReservationAcceptanceEvidenceD1Primitive,
  type FoodDurableReservationAcceptanceEvidenceD1Result,
  type FoodDurableReservationAcceptanceEvidenceD1Statement,
} from "./d1-durable-reservation-acceptance-evidence-persistence";
import {
  FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND,
  type FoodPostMutationReservationAcceptance,
} from "./post-mutation-reservation-acceptance";
import {
  validateFoodReservationAcceptanceVersion,
} from "./reservation-acceptance-domain";

function record(
  input: unknown,
): Record<string, unknown> {
  assert.ok(
    input !== null &&
    typeof input === "object" &&
    !Array.isArray(input),
  );

  return input as
    Record<string, unknown>;
}

function clone(
  input:
    FoodPostMutationReservationAcceptance,
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(input),
  ) as Record<string, unknown>;
}

function fixture():
  FoodPostMutationReservationAcceptance {
  const reservation = {
    kind:
      "authoritative-capacity-reservation-mutation-receipt",
    reservationId:
      "food-capacity-reservation:007y",
    order: {
      id:
        "food-physical-order:007y",
      version:
        1,
    },
    reservationRequest: {
      id:
        "food-reservation-request:007y",
      version:
        1,
    },
    fulfillmentIntent: {
      id:
        "food-fulfillment-intent:007y",
      version:
        1,
    },
    skuClaims: [
      {
        sku: {
          id:
            "food-sku:007y-a",
          version:
            1,
        },
        capacityRevision:
          3,
        quantity:
          2,
      },
      {
        sku: {
          id:
            "food-sku:007y-b",
          version:
            2,
        },
        capacityRevision:
          5,
        quantity:
          1,
      },
    ],
    slotClaim: {
      method:
        "personal-delivery",
      locationReference:
        "location:west-texas",
      windowReference:
        "window:007y",
      capacityRevision:
        4,
      quantity:
        1,
    },
  };

  const acceptance =
    validateFoodReservationAcceptanceVersion({
      id:
        "food-reservation-acceptance:007y",
      version:
        1,
      order: {
        id:
          reservation.order.id,
        version:
          reservation.order.version,
      },
      reservationRequest: {
        id:
          reservation.reservationRequest.id,
        version:
          reservation.reservationRequest.version,
      },
      fulfillmentIntent: {
        id:
          reservation.fulfillmentIntent.id,
        version:
          reservation.fulfillmentIntent.version,
        method:
          reservation.slotClaim.method,
        locationReference:
          reservation.slotClaim.locationReference,
        windowReference:
          reservation.slotClaim.windowReference,
      },
      capacityRequirements:
        reservation.skuClaims.map(
          (claim) => ({
            sku: {
              ...claim.sku,
            },
            quantity:
              claim.quantity,
          }),
        ),
      acceptance: {
        attribution:
          "test:food-007y",
        sourceReference:
          "test:post-mutation-acceptance",
        acceptedOn:
          "2026-10-20",
      },
    });

  return {
    kind:
      FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND,
    reservationOutcome:
      "created",
    reservation:
      reservation as FoodPostMutationReservationAcceptance["reservation"],
    acceptance,
  };
}

type StoredAcceptanceRow =
  Record<string, unknown>;

class MemoryDatabase
implements
  FoodDurableReservationAcceptanceEvidenceD1Database {
  parentPresent =
    true;

  linesPresent =
    true;

  slotPresent =
    true;

  bindingPresent =
    true;

  failInsert =
    false;

  raceExactOnFailure =
    false;

  insertCount =
    0;

  readonly acceptanceRows:
    StoredAcceptanceRow[] =
    [];

  constructor(
    readonly base:
      FoodPostMutationReservationAcceptance =
        fixture(),
  ) {}

  prepare(
    sql: string,
  ):
    FoodDurableReservationAcceptanceEvidenceD1Statement {
    let values:
      FoodDurableReservationAcceptanceEvidenceD1Primitive[] =
      [];

    const statement:
      FoodDurableReservationAcceptanceEvidenceD1Statement = {
      bind: (
        ...next:
          FoodDurableReservationAcceptanceEvidenceD1Primitive[]
      ) => {
        values =
          [...next];

        return statement;
      },

      all:
        async () =>
          this.execute(
            sql,
            values,
          ),
    };

    return statement;
  }

  success(
    results:
      readonly unknown[],
  ):
    FoodDurableReservationAcceptanceEvidenceD1Result {
    return {
      success:
        true,
      results,
    };
  }

  parentRow():
    Record<string, unknown> {
    const receipt =
      this.base.reservation;

    return {
      reservation_id:
        receipt.reservationId,
      order_id:
        receipt.order.id,
      order_version:
        receipt.order.version,
      reservation_request_id:
        receipt.reservationRequest.id,
      reservation_request_version:
        receipt.reservationRequest.version,
      canonical_demand_json:
        JSON.stringify(
          receipt.skuClaims.map(
            (claim) => ({
              sku: {
                ...claim.sku,
              },
              quantity:
                claim.quantity,
            }),
          ),
        ),
      state:
        "held",
    };
  }

  lineRows():
    Record<string, unknown>[] {
    return (
      this.base.reservation
        .skuClaims.map(
          (
            claim,
            lineIndex,
          ) => ({
            reservation_id:
              this.base.reservation
                .reservationId,
            line_index:
              lineIndex,
            sku_id:
              claim.sku.id,
            sku_version:
              claim.sku.version,
            capacity_revision:
              claim.capacityRevision,
            quantity:
              claim.quantity,
          }),
        )
    );
  }

  slotRow():
    Record<string, unknown> {
    const receipt =
      this.base.reservation;

    return {
      reservation_id:
        receipt.reservationId,
      method:
        receipt.slotClaim.method,
      location_reference:
        receipt.slotClaim
          .locationReference,
      window_reference:
        receipt.slotClaim
          .windowReference,
      capacity_revision:
        receipt.slotClaim
          .capacityRevision,
      quantity:
        receipt.slotClaim.quantity,
    };
  }

  bindingRow():
    Record<string, unknown> {
    const receipt =
      this.base.reservation;

    return {
      reservation_id:
        receipt.reservationId,
      fulfillment_intent_id:
        receipt.fulfillmentIntent.id,
      fulfillment_intent_version:
        receipt.fulfillmentIntent
          .version,
    };
  }

  requestedAcceptanceRow():
    StoredAcceptanceRow {
    const value =
      this.base.acceptance;

    return {
      reservation_id:
        this.base.reservation
          .reservationId,
      acceptance_id:
        value.id,
      acceptance_version:
        value.version,
      attribution:
        value.acceptance
          .attribution,
      source_reference:
        value.acceptance
          .sourceReference,
      accepted_on:
        value.acceptance
          .acceptedOn,
    };
  }

  async execute(
    sql: string,
    values:
      readonly FoodDurableReservationAcceptanceEvidenceD1Primitive[],
  ):
    Promise<
      FoodDurableReservationAcceptanceEvidenceD1Result
    > {
    if (
      sql.includes(
        "FROM food_capacity_reservation_lines",
      )
    ) {
      return this.success(
        this.linesPresent
          ? this.lineRows()
          : [],
      );
    }

    if (
      sql.includes(
        "FROM food_fulfillment_slot_reservations",
      )
    ) {
      return this.success(
        this.slotPresent
          ? [this.slotRow()]
          : [],
      );
    }

    if (
      sql.includes(
        "FROM food_capacity_reservation_fulfillment_intents",
      )
    ) {
      return this.success(
        this.bindingPresent
          ? [this.bindingRow()]
          : [],
      );
    }

    if (
      sql.includes(
        "FROM food_capacity_reservations",
      )
    ) {
      return this.success(
        this.parentPresent
          ? [this.parentRow()]
          : [],
      );
    }

    if (
      sql.includes(
        "FROM food_reservation_acceptance_evidence",
      ) &&
      sql.includes(
        "WHERE reservation_id = ?",
      )
    ) {
      return this.success(
        this.acceptanceRows.filter(
          (row) =>
            row.reservation_id ===
            values[0],
        ),
      );
    }

    if (
      sql.includes(
        "FROM food_reservation_acceptance_evidence",
      ) &&
      sql.includes(
        "WHERE acceptance_id = ?",
      )
    ) {
      return this.success(
        this.acceptanceRows.filter(
          (row) =>
            row.acceptance_id ===
              values[0] &&
            row.acceptance_version ===
              values[1],
        ),
      );
    }

    if (
      sql.includes(
        "INSERT INTO food_reservation_acceptance_evidence",
      )
    ) {
      this.insertCount++;

      const inserted:
        StoredAcceptanceRow = {
        reservation_id:
          values[0],
        acceptance_id:
          values[1],
        acceptance_version:
          values[2],
        attribution:
          values[3],
        source_reference:
          values[4],
        accepted_on:
          values[5],
      };

      if (
        this.failInsert
      ) {
        if (
          this.raceExactOnFailure
        ) {
          this.acceptanceRows.push(
            inserted,
          );
        }

        throw new Error(
          "synthetic insert failure",
        );
      }

      this.acceptanceRows.push(
        inserted,
      );

      return this.success(
        [inserted],
      );
    }

    throw new Error(
      `Unexpected SQL: ${sql}`,
    );
  }
}

test(
  "007Y fresh exact composition creates one immutable durable acceptance evidence row",
  async () => {
    const db =
      new MemoryDatabase();

    const mutable =
      clone(
        fixture(),
      );

    const result =
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        mutable as unknown as
          FoodPostMutationReservationAcceptance,
      );

    assert.equal(
      result.outcome,
      "created",
    );

    if (
      result.outcome !==
        "created"
    ) {
      assert.fail(
        "expected created",
      );
    }

    assert.equal(
      db.insertCount,
      1,
    );

    assert.equal(
      db.acceptanceRows.length,
      1,
    );

    assert.equal(
      result.value.kind,
      FOOD_DURABLE_RESERVATION_ACCEPTANCE_EVIDENCE_KIND,
    );

    assert.equal(
      Object.isFrozen(
        result.value,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.value.acceptance,
      ),
      true,
    );

    const inputAcceptance =
      record(
        record(
          mutable.acceptance,
        ).acceptance,
      );

    inputAcceptance.acceptedOn =
      "2026-10-21";

    assert.equal(
      result.value.acceptance
        .acceptance.acceptedOn,
      "2026-10-20",
    );
  },
);

test(
  "007Y exact replay returns already-present without another write and ignores W reservationOutcome provenance",
  async () => {
    const db =
      new MemoryDatabase();

    assert.equal(
      (
        await persistFoodDurableReservationAcceptanceEvidence(
          db,
          fixture(),
        )
      ).outcome,
      "created",
    );

    const replay =
      clone(
        fixture(),
      );

    replay.reservationOutcome =
      "already-present";

    const result =
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        replay as unknown as
          FoodPostMutationReservationAcceptance,
      );

    assert.equal(
      result.outcome,
      "already-present",
    );

    assert.equal(
      db.insertCount,
      1,
    );
  },
);

test(
  "007Y same reservation and acceptance identity with different metadata conflicts",
  async () => {
    const db =
      new MemoryDatabase();

    await persistFoodDurableReservationAcceptanceEvidence(
      db,
      fixture(),
    );

    const changed =
      clone(
        fixture(),
      );

    record(
      record(
        changed.acceptance,
      ).acceptance,
    ).attribution =
      "test:other";

    const result =
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        changed as unknown as
          FoodPostMutationReservationAcceptance,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "conflict",
      },
    );

    assert.equal(
      db.insertCount,
      1,
    );
  },
);

test(
  "007Y same reservation with a different acceptance identity conflicts",
  async () => {
    const db =
      new MemoryDatabase();

    await persistFoodDurableReservationAcceptanceEvidence(
      db,
      fixture(),
    );

    const changed =
      clone(
        fixture(),
      );

    record(
      changed.acceptance,
    ).id =
      "food-reservation-acceptance:other";

    assert.deepEqual(
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        changed as unknown as
          FoodPostMutationReservationAcceptance,
      ),
      {
        outcome:
          "conflict",
      },
    );
  },
);

test(
  "007Y same acceptance identity already bound to another reservation conflicts",
  async () => {
    const base =
      fixture();

    const db =
      new MemoryDatabase(
        base,
      );

    db.acceptanceRows.push({
      ...db.requestedAcceptanceRow(),
      reservation_id:
        "food-capacity-reservation:other",
    });

    assert.deepEqual(
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        base,
      ),
      {
        outcome:
          "conflict",
      },
    );

    assert.equal(
      db.insertCount,
      0,
    );
  },
);

test(
  "007Y missing authoritative reservation returns reservation-not-established and performs no write",
  async () => {
    const db =
      new MemoryDatabase();

    db.parentPresent =
      false;

    assert.deepEqual(
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        fixture(),
      ),
      {
        outcome:
          "reservation-not-established",
      },
    );

    assert.equal(
      db.insertCount,
      0,
    );
  },
);

test(
  "007Y missing required reservation children fail closed as storage-failure",
  async () => {
    for (
      const field of [
        "linesPresent",
        "slotPresent",
        "bindingPresent",
      ] as const
    ) {
      const db =
        new MemoryDatabase();

      db[field] =
        false;

      assert.deepEqual(
        await persistFoodDurableReservationAcceptanceEvidence(
          db,
          fixture(),
        ),
        {
          outcome:
            "storage-failure",
        },
        field,
      );

      assert.equal(
        db.insertCount,
        0,
      );
    }
  },
);

test(
  "007Y caller receipt divergence from durable reservation is conflict",
  async () => {
    const db =
      new MemoryDatabase();

    const changed =
      clone(
        fixture(),
      );

    const reservation =
      record(
        changed.reservation,
      );

    const claims =
      reservation.skuClaims as
        unknown[];

    record(
      claims[0],
    ).capacityRevision =
      4;

    assert.deepEqual(
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        changed as unknown as
          FoodPostMutationReservationAcceptance,
      ),
      {
        outcome:
          "conflict",
      },
    );

    assert.equal(
      db.insertCount,
      0,
    );
  },
);

test(
  "007Y acceptance mismatch against authenticated durable reservation is conflict",
  async () => {
    const db =
      new MemoryDatabase();

    const changed =
      clone(
        fixture(),
      );

    record(
      record(
        changed.acceptance,
      ).fulfillmentIntent,
    ).locationReference =
      "location:other";

    assert.deepEqual(
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        changed as unknown as
          FoodPostMutationReservationAcceptance,
      ),
      {
        outcome:
          "conflict",
      },
    );

    assert.equal(
      db.insertCount,
      0,
    );
  },
);

test(
  "007Y rejects caller accessors without invocation",
  async () => {
    let calls =
      0;

    const input =
      clone(
        fixture(),
      );

    Object.defineProperty(
      input,
      "reservation",
      {
        enumerable:
          true,
        configurable:
          true,
        get() {
          calls++;

          return fixture()
            .reservation;
        },
      },
    );

    const db =
      new MemoryDatabase();

    assert.deepEqual(
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        input as unknown as
          FoodPostMutationReservationAcceptance,
      ),
      {
        outcome:
          "invalid",
      },
    );

    assert.equal(
      calls,
      0,
    );

    assert.equal(
      db.insertCount,
      0,
    );
  },
);

test(
  "007Y uncertain insert with exact raced durable evidence returns already-present",
  async () => {
    const db =
      new MemoryDatabase();

    db.failInsert =
      true;

    db.raceExactOnFailure =
      true;

    assert.deepEqual(
      (
        await persistFoodDurableReservationAcceptanceEvidence(
          db,
          fixture(),
        )
      ).outcome,
      "already-present",
    );

    assert.equal(
      db.insertCount,
      1,
    );

    assert.equal(
      db.acceptanceRows.length,
      1,
    );
  },
);

test(
  "007Y failed insert with no durable acceptance evidence returns storage-failure",
  async () => {
    const db =
      new MemoryDatabase();

    db.failInsert =
      true;

    assert.deepEqual(
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        fixture(),
      ),
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      db.insertCount,
      1,
    );

    assert.equal(
      db.acceptanceRows.length,
      0,
    );
  },
);

test(
  "007Y malformed durable acceptance evidence fails closed as storage-failure",
  async () => {
    const db =
      new MemoryDatabase();

    db.acceptanceRows.push({
      ...db.requestedAcceptanceRow(),
      accepted_on:
        "not-a-date",
    });

    assert.deepEqual(
      await persistFoodDurableReservationAcceptanceEvidence(
        db,
        fixture(),
      ),
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      db.insertCount,
      0,
    );
  },
);

test(
  "007Y migration defines immutable one-acceptance-per-reservation evidence and does not alter older migrations",
  () => {
    const migration =
      readFileSync(
        new URL(
          "../../../migrations/food/0007_food_reservation_acceptance_evidence.sql",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      migration,
      /CREATE TABLE IF NOT EXISTS food_reservation_acceptance_evidence/,
    );

    assert.match(
      migration,
      /PRIMARY KEY\s*\(\s*acceptance_id,\s*acceptance_version\s*\)/s,
    );

    assert.match(
      migration,
      /UNIQUE\s*\(\s*reservation_id\s*\)/s,
    );

    assert.match(
      migration,
      /REFERENCES food_capacity_reservations\s*\(\s*reservation_id\s*\)/s,
    );

    assert.match(
      migration,
      /acceptance_version = 1/,
    );

    assert.match(
      migration,
      /food_reservation_acceptance_evidence_no_update/,
    );

    assert.match(
      migration,
      /food_reservation_acceptance_evidence_no_delete/,
    );

    assert.doesNotMatch(
      migration,
      /\bALTER\s+TABLE\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\bDROP\s+(?:TABLE|TRIGGER)\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\bDELETE\s+FROM\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\bUPDATE\s+food_reservation_acceptance_evidence\s+SET\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\b(?:UPSERT|ON CONFLICT)\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\bCASCADE\b/i,
    );
  },
);
