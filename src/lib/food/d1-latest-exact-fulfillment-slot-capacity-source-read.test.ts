import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  readFoodLatestExactFulfillmentSlotCapacitySourceRevision as read,
} from "./d1-latest-exact-fulfillment-slot-capacity-source-read";

import type {
  FoodExactFulfillmentSlotCapacitySourceReadD1Database,
  FoodExactFulfillmentSlotCapacitySourceReadD1Result,
  FoodExactFulfillmentSlotCapacitySourceReadD1Statement,
} from "./d1-exact-fulfillment-slot-capacity-source-read";

import {
  FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
} from "./fulfillment-slot-capacity-source-domain";

function selector() {
  return {
    method: "personal-delivery" as const,
    locationReference: "location:big-spring",
    windowReference: "window:2026-10-21T17:00",
  };
}

function row(
  revision = 3,
  capacityUnits = 16,
) {
  return {
    method: selector().method,
    location_reference:
      selector().locationReference,
    window_reference:
      selector().windowReference,
    revision,
    capacity_units: capacityUnits,
    attribution: "synthetic:007h",
    source_reference:
      `synthetic:slot-capacity:${revision}`,
  };
}

class Statement
implements FoodExactFulfillmentSlotCapacitySourceReadD1Statement {
  constructor(
    private readonly database: Database,
  ) {}

  bind(
    ...values: readonly (string | number)[]
  ): FoodExactFulfillmentSlotCapacitySourceReadD1Statement {
    this.database.binds += 1;

    if (this.database.throwBind) {
      throw new Error("synthetic bind failure");
    }

    this.database.bound = [...values];

    return this;
  }

  async all<T = Record<string, unknown>>():
    Promise<
      FoodExactFulfillmentSlotCapacitySourceReadD1Result<T>
    > {
    this.database.reads += 1;

    if (this.database.throwAll) {
      throw new Error("synthetic read failure");
    }

    if (this.database.gate) {
      await this.database.gate;
    }

    return this.database.response as
      FoodExactFulfillmentSlotCapacitySourceReadD1Result<T>;
  }
}

class Database
implements FoodExactFulfillmentSlotCapacitySourceReadD1Database {
  prepares = 0;
  binds = 0;
  reads = 0;

  sql = "";
  bound: readonly (string | number)[] = [];

  response: unknown = {
    success: true,
    results: [row()],
  };

  throwPrepare = false;
  throwBind = false;
  throwAll = false;

  gate: Promise<void> | null = null;

  prepare(
    sql: string,
  ): FoodExactFulfillmentSlotCapacitySourceReadD1Statement {
    this.prepares += 1;

    if (this.throwPrepare) {
      throw new Error("synthetic prepare failure");
    }

    this.sql = sql;

    return new Statement(this);
  }
}

test(
  "007H returns latest-recorded structurally valid slot source",
  async () => {
    const database = new Database();
    const stored = row(7, 9);

    database.response = {
      success: true,
      results: [stored],
    };

    const result =
      await read(
        database,
        selector(),
      );

    assert.deepEqual(
      result,
      {
        outcome: "found",
        value: {
          kind:
            FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
          method:
            selector().method,
          locationReference:
            selector().locationReference,
          windowReference:
            selector().windowReference,
          revision: 7,
          capacityUnits: 9,
          attribution:
            "synthetic:007h",
          sourceReference:
            "synthetic:slot-capacity:7",
        },
      },
    );

    assert.ok(
      Object.isFrozen(result),
    );

    if (result.outcome !== "found") {
      throw new Error("expected found");
    }

    assert.ok(
      Object.isFrozen(result.value),
    );

    assert.deepEqual(
      Object.keys(result).sort(),
      ["outcome", "value"],
    );

    assert.deepEqual(
      Object.keys(result.value).sort(),
      [
        "kind",
        "method",
        "locationReference",
        "windowReference",
        "revision",
        "capacityUnits",
        "attribution",
        "sourceReference",
      ].sort(),
    );

    stored.capacity_units = 99;
    stored.attribution = "changed";

    assert.equal(
      result.value.capacityUnits,
      9,
    );

    assert.equal(
      result.value.attribution,
      "synthetic:007h",
    );
  },
);

for (
  const method of
    ["personal-delivery", "meetup"] as const
) {
  test(
    `007H supports exact method ${method}`,
    async () => {
      const database = new Database();

      database.response = {
        success: true,
        results: [
          {
            ...row(),
            method,
          },
        ],
      };

      const result =
        await read(
          database,
          {
            ...selector(),
            method,
          },
        );

      assert.equal(
        result.outcome,
        "found",
      );

      if (result.outcome !== "found") {
        throw new Error("expected found");
      }

      assert.equal(
        result.value.method,
        method,
      );
    },
  );
}

test(
  "007H preserves zero capacity as recorded evidence",
  async () => {
    const database = new Database();

    database.response = {
      success: true,
      results: [row(8, 0)],
    };

    const result =
      await read(
        database,
        selector(),
      );

    assert.equal(
      result.outcome,
      "found",
    );

    if (result.outcome !== "found") {
      throw new Error("expected found");
    }

    assert.equal(
      result.value.revision,
      8,
    );

    assert.equal(
      result.value.capacityUnits,
      0,
    );
  },
);

test(
  "007H zero rows is not-found",
  async () => {
    const database = new Database();

    database.response = {
      success: true,
      results: [],
    };

    const result =
      await read(
        database,
        selector(),
      );

    assert.deepEqual(
      result,
      {
        outcome: "not-found",
      },
    );

    assert.ok(
      Object.isFrozen(result),
    );
  },
);

test(
  "007H captures selector before async continuation",
  async () => {
    const database = new Database();

    let release:
      (() => void) |
      undefined;

    database.gate =
      new Promise<void>(
        resolve => {
          release = resolve;
        },
      );

    const input = {
      method:
        "personal-delivery" as
          "personal-delivery" | "meetup",
      locationReference:
        "location:big-spring",
      windowReference:
        "window:2026-10-21T17:00",
    };

    const promise =
      read(
        database,
        input,
      );

    input.method = "meetup";
    input.locationReference =
      "location:changed";
    input.windowReference =
      "window:changed";

    if (!release) {
      throw new Error(
        "expected release callback",
      );
    }

    release();

    const result =
      await promise;

    assert.equal(
      result.outcome,
      "found",
    );

    assert.deepEqual(
      database.bound,
      [
        "personal-delivery",
        "location:big-spring",
        "window:2026-10-21T17:00",
      ],
    );

    assert.equal(
      Object.isFrozen(input),
      false,
    );
  },
);

const invalidSelectors: unknown[] = [
  null,
  undefined,
  [],
  "",
  1,
  {},
  {
    ...selector(),
    extra: true,
  },
  {
    ...selector(),
    revision: 1,
  },
  {
    method: "pickup",
    locationReference:
      selector().locationReference,
    windowReference:
      selector().windowReference,
  },
  {
    ...selector(),
    method: "",
  },
  {
    ...selector(),
    method: 5,
  },
  {
    ...selector(),
    locationReference: "",
  },
  {
    ...selector(),
    locationReference: " padded",
  },
  {
    ...selector(),
    locationReference: "padded ",
  },
  {
    ...selector(),
    locationReference: "x".repeat(513),
  },
  {
    ...selector(),
    locationReference: 5,
  },
  {
    ...selector(),
    locationReference: null,
  },
  {
    ...selector(),
    windowReference: "",
  },
  {
    ...selector(),
    windowReference: " padded",
  },
  {
    ...selector(),
    windowReference: "padded ",
  },
  {
    ...selector(),
    windowReference: "x".repeat(513),
  },
  {
    ...selector(),
    windowReference: 5,
  },
  {
    ...selector(),
    windowReference: null,
  },
  Object.assign(
    selector(),
    {
      [Symbol("extra")]:
        true,
    },
  ),
  Object.create(
    {
      method:
        selector().method,
    },
    {
      locationReference: {
        value:
          selector().locationReference,
        enumerable: true,
      },
      windowReference: {
        value:
          selector().windowReference,
        enumerable: true,
      },
    },
  ),
];

for (
  const [index, input]
  of invalidSelectors.entries()
) {
  test(
    `007H invalid selector ${index} performs zero DB access`,
    async () => {
      const database =
        new Database();

      const result =
        await read(
          database,
          input,
        );

      assert.deepEqual(
        result,
        {
          outcome: "invalid",
        },
      );

      assert.equal(
        database.prepares,
        0,
      );

      assert.equal(
        database.binds,
        0,
      );

      assert.equal(
        database.reads,
        0,
      );
    },
  );
}

test(
  "007H rejects root accessor without invoking it",
  async () => {
    let calls = 0;

    const input: Record<string, unknown> = {
      locationReference:
        selector().locationReference,
      windowReference:
        selector().windowReference,
    };

    Object.defineProperty(
      input,
      "method",
      {
        enumerable: true,
        get() {
          calls += 1;
          return "personal-delivery";
        },
      },
    );

    const database = new Database();

    const result =
      await read(
        database,
        input,
      );

    assert.equal(
      result.outcome,
      "invalid",
    );

    assert.equal(
      calls,
      0,
    );

    assert.equal(
      database.prepares,
      0,
    );
  },
);

const malformedEnvelopes: unknown[] = [
  null,
  undefined,
  [],
  {},
  {
    success: false,
    results: [],
  },
  {
    success: true,
  },
  {
    success: true,
    results: null,
  },
  {
    success: true,
    results: {},
  },
  {
    success: true,
    results: [row(), row(2)],
  },
];

for (
  const [index, response]
  of malformedEnvelopes.entries()
) {
  test(
    `007H malformed storage envelope ${index} fails closed`,
    async () => {
      const database =
        new Database();

      database.response =
        response;

      const result =
        await read(
          database,
          selector(),
        );

      assert.equal(
        result.outcome,
        "storage-failure",
      );
    },
  );
}

const invalidRows: unknown[] = [
  null,
  undefined,
  [],
  {},
  {
    ...row(),
    method: "pickup",
  },
  {
    ...row(),
    extra: true,
  },
  Object.assign(
    row(),
    {
      [Symbol("extra")]:
        true,
    },
  ),
];

for (
  const revision of
    [
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      "3",
      NaN,
      Infinity,
    ]
) {
  invalidRows.push({
    ...row(),
    revision,
  });
}

for (
  const capacity of
    [
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      "16",
      NaN,
      Infinity,
      null,
      undefined,
    ]
) {
  invalidRows.push({
    ...row(),
    capacity_units:
      capacity,
  });
}

for (
  const field of
    [
      "location_reference",
      "window_reference",
      "attribution",
      "source_reference",
    ]
) {
  for (
    const text of
      [
        "",
        " padded",
        "padded ",
        "x".repeat(513),
        5,
        null,
        undefined,
      ]
  ) {
    invalidRows.push({
      ...row(),
      [field]: text,
    });
  }
}

const accessorRow = row();

Object.defineProperty(
  accessorRow,
  "capacity_units",
  {
    enumerable: true,
    get() {
      throw new Error(
        "bad row accessor",
      );
    },
  },
);

invalidRows.push(
  accessorRow,
);

for (
  const [index, stored]
  of invalidRows.entries()
) {
  test(
    `007H malformed highest recorded row ${index} fails closed`,
    async () => {
      const database =
        new Database();

      database.response = {
        success: true,
        results: [stored],
      };

      const result =
        await read(
          database,
          selector(),
        );

      assert.equal(
        result.outcome,
        "storage-failure",
      );
    },
  );
}

for (
  const [
    name,
    stored,
  ] of [
    [
      "method",
      {
        ...row(),
        method: "meetup",
      },
    ],
    [
      "locationReference",
      {
        ...row(),
        location_reference:
          "location:other",
      },
    ],
    [
      "windowReference",
      {
        ...row(),
        window_reference:
          "window:other",
      },
    ],
  ] as const
) {
  test(
    `007H returned ${name} mismatch is storage-failure`,
    async () => {
      const database =
        new Database();

      database.response = {
        success: true,
        results: [stored],
      };

      const result =
        await read(
          database,
          selector(),
        );

      assert.equal(
        result.outcome,
        "storage-failure",
      );
    },
  );
}

for (
  const failure of
    [
      "prepare",
      "bind",
      "all",
    ] as const
) {
  test(
    `007H ${failure} exception is storage-failure`,
    async () => {
      const database =
        new Database();

      if (failure === "prepare") {
        database.throwPrepare =
          true;
      }

      if (failure === "bind") {
        database.throwBind =
          true;
      }

      if (failure === "all") {
        database.throwAll =
          true;
      }

      const result =
        await read(
          database,
          selector(),
        );

      assert.equal(
        result.outcome,
        "storage-failure",
      );
    },
  );
}

test(
  "007H executes one bound latest-recorded seven-column SELECT only",
  async () => {
    const database =
      new Database();

    await read(
      database,
      selector(),
    );

    assert.equal(
      database.sql
        .replace(
          /\s+/g,
          " ",
        )
        .trim(),
      "SELECT method, location_reference, window_reference, revision, capacity_units, attribution, source_reference FROM food_fulfillment_slot_capacity_sources WHERE method = ? AND location_reference = ? AND window_reference = ? ORDER BY revision DESC LIMIT 1",
    );

    assert.deepEqual(
      database.bound,
      [
        selector().method,
        selector().locationReference,
        selector().windowReference,
      ],
    );

    assert.equal(
      database.prepares,
      1,
    );

    assert.equal(
      database.binds,
      1,
    );

    assert.equal(
      database.reads,
      1,
    );
  },
);

test(
  "007H returned revision is evidence only and selector contains no authority fields",
  async () => {
    const database =
      new Database();

    database.response = {
      success: true,
      results: [row(11, 2)],
    };

    const input =
      selector();

    const result =
      await read(
        database,
        input,
      );

    assert.equal(
      result.outcome,
      "found",
    );

    if (result.outcome !== "found") {
      throw new Error("expected found");
    }

    assert.equal(
      result.value.revision,
      11,
    );

    for (
      const field of
        [
          "latest",
          "current",
          "fresh",
          "governing",
          "eligible",
          "trusted",
          "available",
          "remaining",
          "reservable",
          "atp",
          "request",
          "reservation",
          "active",
        ]
    ) {
      assert.equal(
        field in input,
        false,
      );

      assert.equal(
        field in result.value,
        false,
      );
    }
  },
);

test(
  "007H source preserves read-only evidence and side-effect boundaries",
  async () => {
    const source =
      await readFile(
        new URL(
          "./d1-latest-exact-fulfillment-slot-capacity-source-read.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      source,
      /ORDER BY revision DESC/,
    );

    assert.match(
      source,
      /LIMIT 1/,
    );

    assert.match(
      source,
      /food_fulfillment_slot_capacity_sources/,
    );

    assert.doesNotMatch(
      source,
      /food_capacity_reservations/,
    );

    assert.doesNotMatch(
      source,
      /food_capacity_reservation_lines/,
    );

    assert.doesNotMatch(
      source,
      /food_fulfillment_slot_reservations/,
    );

    assert.doesNotMatch(
      source,
      /\bINSERT\b/i,
    );

    assert.doesNotMatch(
      source,
      /\bUPDATE\b/i,
    );

    assert.doesNotMatch(
      source,
      /\bDELETE\b/i,
    );

    assert.doesNotMatch(
      source,
      /readFoodLatestExactSkuStockedCapacitySourceRevision/,
    );
  },
);
