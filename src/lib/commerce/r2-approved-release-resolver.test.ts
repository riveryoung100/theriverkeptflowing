import assert from "node:assert/strict";
import {
    createHash
} from "node:crypto";
import test from "node:test";

import {
    R2ApprovedReleaseResolver,
    type R2ReleaseBucket
} from "./r2-approved-release-resolver";


class ObjectDouble {

    public constructor(
        private readonly bytes:
            Uint8Array
    ) {}


    public async text():
    Promise<string> {

        return new TextDecoder()
            .decode(
                this.bytes
            );

    }


    public async arrayBuffer():
    Promise<ArrayBuffer> {

        return this.bytes
            .slice()
            .buffer;

    }

}


class BucketDouble
implements R2ReleaseBucket {

    public readonly objects =
        new Map<
            string,
            Uint8Array
        >();


    public async get(
        key:
            string
    ) {

        const value =
            this.objects.get(
                key
            );

        return value ===
            undefined
            ? null
            : new ObjectDouble(
                value
            );

    }

}


function createFixture() {

    const bucket =
        new BucketDouble();

    const artifactBytes =
        new TextEncoder()
            .encode(
                "%PDF-river-runtime"
            );

    const releaseId =
        "product-001e-07-runtime-approved-001";

    const root =
        `releases/river-life-operating-system/v1/${releaseId}`;

    const manifest =
        {
            productId:
                "river-life-operating-system",

            productVersion:
                "v1",

            releaseId,

            artifactFilename:
                "river-life-operating-system-v1.pdf",

            artifactFormat:
                "PDF",

            artifactByteSize:
                artifactBytes.byteLength,

            artifactSha256:
                createHash(
                    "sha256"
                )
                    .update(
                        artifactBytes
                    )
                    .digest(
                        "hex"
                    ),

            createdAt:
                "2026-09-07T01:49:45.805Z",

            releaseStatus:
                "approved"
        };

    bucket.objects.set(
        `${root}/${releaseId}.release.json`,
        new TextEncoder()
            .encode(
                JSON.stringify(
                    manifest
                )
            )
    );

    bucket.objects.set(
        `${root}/river-life-operating-system-v1.pdf`,
        artifactBytes
    );

    const resolver =
        new R2ApprovedReleaseResolver(
            bucket,
            {
                productId:
                    "river-life-operating-system",

                productVersion:
                    "v1",

                releaseId,

                keyPrefix:
                    "releases"
            }
        );

    return {
        bucket,
        resolver,
        artifactBytes,
        manifest,
        root
    };

}


test(
    "resolves the configured approved release from R2 with integrity verification",
    async () => {

        const {
            resolver,
            artifactBytes
        } =
            createFixture();

        const result =
            await resolver
                .resolveApprovedRelease(
                    "river-life-operating-system",
                    "v1"
                );

        assert.equal(
            result.release.releaseStatus,
            "approved"
        );

        assert.equal(
            result.release.releaseId,
            "product-001e-07-runtime-approved-001"
        );

        assert.deepEqual(
            result.artifactBytes,
            artifactBytes
        );

    }
);


test(
    "rejects product identity outside the configured release",
    async () => {

        const {
            resolver
        } =
            createFixture();

        await assert.rejects(
            () =>
                resolver.resolveApprovedRelease(
                    "other-product",
                    "v1"
                ),
            /configured approved release/
        );

    }
);


test(
    "rejects missing R2 release manifest",
    async () => {

        const {
            bucket,
            resolver,
            root
        } =
            createFixture();

        bucket.objects.delete(
            `${root}/product-001e-07-runtime-approved-001.release.json`
        );

        await assert.rejects(
            () =>
                resolver.resolveApprovedRelease(
                    "river-life-operating-system",
                    "v1"
                ),
            /manifest is missing/
        );

    }
);


test(
    "rejects non-approved R2 manifest",
    async () => {

        const {
            bucket,
            resolver,
            manifest,
            root
        } =
            createFixture();

        bucket.objects.set(
            `${root}/product-001e-07-runtime-approved-001.release.json`,
            new TextEncoder()
                .encode(
                    JSON.stringify({
                        ...manifest,
                        releaseStatus:
                            "draft"
                    })
                )
        );

        await assert.rejects(
            () =>
                resolver.resolveApprovedRelease(
                    "river-life-operating-system",
                    "v1"
                ),
            /must be approved/
        );

    }
);


test(
    "rejects R2 artifact SHA-256 drift",
    async () => {

        const {
            bucket,
            resolver,
            artifactBytes,
            root
        } =
            createFixture();

        const drifted =
            artifactBytes.slice();

        drifted[
            drifted.length - 1
        ] ^=
            1;

        bucket.objects.set(
            `${root}/river-life-operating-system-v1.pdf`,
            drifted
        );

        await assert.rejects(
            () =>
                resolver.resolveApprovedRelease(
                    "river-life-operating-system",
                    "v1"
                ),
            /SHA-256/
        );

    }
);
