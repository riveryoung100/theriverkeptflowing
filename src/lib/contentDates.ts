import { z } from "astro/zod";

// Reject booleans and numeric epoch coercion before constructing a Date.
export const contentDateSchema = z.union([
    z.date(),
    z.iso.date(),
    z.iso.datetime({ offset: true })
]).pipe(z.coerce.date());

export function formatContentDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    }).format(date);
}
