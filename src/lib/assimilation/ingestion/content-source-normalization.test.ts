import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizePublishedContentSource
} from "./content-source-normalization";


test(
    "normalizes a published YouTube source into the canonical record",
    () => {

        const record =
            normalizePublishedContentSource(
                {
                    platform:
                        "YouTube",
                    url:
                        "https://youtu.be/abc123#fragment",
                    title:
                        "  A River Video  ",
                    description:
                        "  Source description.  ",
                    publishedAt:
                        "2026-09-07T12:00:00Z",
                    durationSeconds:
                        420,
                    pillar:
                        " Faith ",
                    tags: [
                        "Faith",
                        "Purpose",
                        "faith"
                    ]
                },
                {
                    now:
                        "2026-09-07T13:00:00.000Z"
                }
            );

        assert.equal(
            record.platform,
            "youtube"
        );

        assert.equal(
            record.canonicalUrl,
            "https://www.youtube.com/watch?v=abc123"
        );

        assert.equal(
            record.externalPlatformId,
            "abc123"
        );

        assert.equal(
            record.sourceId,
            "source:youtube:abc123"
        );

        assert.equal(
            record.title,
            "A River Video"
        );

        assert.equal(
            record.description,
            "Source description."
        );

        assert.equal(
            record.publishedAt,
            "2026-09-07T12:00:00.000Z"
        );

        assert.equal(
            record.sourceStatus,
            "transcript-pending"
        );

        assert.equal(
            record.pillar,
            "faith"
        );

        assert.deepEqual(
            record.tags,
            [
                "faith",
                "purpose"
            ]
        );

        assert.equal(
            record.originalSourcePreserved,
            true
        );

    }
);


test(
    "creates the same River source identity for equivalent YouTube URLs",
    () => {

        const first =
            normalizePublishedContentSource(
                {
                    platform:
                        "youtube",
                    url:
                        "https://youtu.be/abc123",
                    title:
                        "Video",
                    publishedAt:
                        "2026-09-07T12:00:00Z"
                },
                {
                    now:
                        "2026-09-07T13:00:00.000Z"
                }
            );

        const second =
            normalizePublishedContentSource(
                {
                    platform:
                        "youtube",
                    url:
                        "https://www.youtube.com/watch?v=abc123",
                    title:
                        "Video",
                    publishedAt:
                        "2026-09-07T12:00:00Z"
                },
                {
                    now:
                        "2026-09-07T13:00:00.000Z"
                }
            );

        assert.equal(
            first.sourceId,
            second.sourceId
        );

        assert.equal(
            first.canonicalUrl,
            second.canonicalUrl
        );

    }
);


test(
    "uses explicit platform identity when supplied",
    () => {

        const record =
            normalizePublishedContentSource(
                {
                    platform:
                        "linkedin",
                    url:
                        "https://www.linkedin.com/posts/river-example",
                    externalPlatformId:
                        "urn:li:activity:12345",
                    title:
                        "LinkedIn Source",
                    publishedAt:
                        "2026-09-07T12:00:00Z"
                },
                {
                    now:
                        "2026-09-07T13:00:00.000Z"
                }
            );

        assert.equal(
            record.externalPlatformId,
            "urn:li:activity:12345"
        );

        assert.equal(
            record.sourceId,
            "source:linkedin:urn-li-activity-12345"
        );

    }
);


test(
    "rejects an invalid published source URL",
    () => {

        assert.throws(
            () =>
                normalizePublishedContentSource(
                    {
                        platform:
                            "youtube",
                        url:
                            "not-a-url",
                        title:
                            "Bad Source",
                        publishedAt:
                            "2026-09-07T12:00:00Z"
                    }
                ),
            TypeError
        );

    }
);


test(
    "fails closed when platform identity cannot be derived",
    () => {

        assert.throws(
            () =>
                normalizePublishedContentSource(
                    {
                        platform:
                            "other",
                        url:
                            "https://example.com/",
                        title:
                            "No Identity",
                        publishedAt:
                            "2026-09-07T12:00:00Z"
                    }
                ),
            {
                name:
                    "TypeError",
                message:
                    "Unable to determine external platform identity."
            }
        );

    }
);
