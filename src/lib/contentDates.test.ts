import test from "node:test";
import assert from "node:assert/strict";
import { contentDateSchema, formatContentDate } from "./contentDates";

test("content dates reject coerced epoch values and malformed calendar dates", () => {
    for (const invalid of [true, false, 0, 1, null, undefined, "", "2026-02-30", "2026-08-27T12:00:00", {}, []]) {
        assert.equal(contentDateSchema.safeParse(invalid).success, false, JSON.stringify(invalid));
    }
    assert.equal(contentDateSchema.nullable().parse(null), null);
    assert.equal(contentDateSchema.nullable().safeParse(true).success, false);
});

test("date-only and offset timestamps preserve their actual UTC instant", () => {
    assert.equal(contentDateSchema.parse("2026-08-27").toISOString(), "2026-08-27T00:00:00.000Z");
    assert.equal(contentDateSchema.parse("2026-08-27T23:30:00-05:00").toISOString(), "2026-08-28T04:30:00.000Z");
    assert.equal(contentDateSchema.parse(new Date("2026-08-27T00:00:00Z")).toISOString(), "2026-08-27T00:00:00.000Z");
});

test("display dates remain stable in deployment time zones", () => {
    const previous = process.env.TZ;
    try {
        for (const zone of ["UTC", "America/Chicago", "America/Los_Angeles", "Pacific/Kiritimati"]) {
            process.env.TZ = zone;
            assert.equal(formatContentDate(new Date("2026-08-27T00:00:00Z")), "August 27, 2026", zone);
            assert.equal(formatContentDate(new Date("2026-08-26T00:00:00Z")), "August 26, 2026", zone);
        }
    } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
    }
});
