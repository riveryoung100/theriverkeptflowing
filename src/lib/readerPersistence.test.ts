import assert from "node:assert/strict";
import test from "node:test";

import {
    READER_BACKUP_FORMAT,
    READER_STORAGE_VERSION,
    getReaderBookmarkKey,
    getReaderMemoryKey,
    normalizeReaderMemoryRecord,
    readReaderBookmark,
    writeReaderBookmark,
    removeReaderBookmark,
    readReaderMemory,
    writeReaderMemory,
    removeReaderMemory,
    setReaderMemoryCompletion,
    buildReaderDataBackup,
    previewReaderDataImport,
    importReaderDataBackup
} from "./readerPersistence";


class MemoryStorage
    implements Storage {

    private readonly values =
        new Map<string, string>();


    get length(): number {

        return this.values.size;

    }


    clear(): void {

        this.values.clear();

    }


    getItem(
        key: string
    ): string | null {

        return (
            this.values.get(key) ??
            null
        );

    }


    key(
        index: number
    ): string | null {

        return (
            Array.from(
                this.values.keys()
            )[index] ??
            null
        );

    }


    removeItem(
        key: string
    ): void {

        this.values.delete(key);

    }


    setItem(
        key: string,
        value: string
    ): void {

        this.values.set(
            key,
            value
        );

    }

}


interface ReaderTestWindow {

    localStorage: Storage;

    dispatchEvent(
        event: Event
    ): boolean;

}


function installBrowserHarness(): {
    storage: MemoryStorage;
    dispatchedEvents: Event[];
    restore(): void;
} {

    const globalRecord =
        globalThis as unknown as {
            window?: ReaderTestWindow;
            CustomEvent?: typeof CustomEvent;
        };

    const previousWindow =
        globalRecord.window;

    const previousCustomEvent =
        globalRecord.CustomEvent;

    const storage =
        new MemoryStorage();

    const dispatchedEvents:
        Event[] = [];


    class ReaderCustomEvent<T = unknown>
        extends Event {

        readonly detail: T;


        constructor(
            type: string,
            init?: CustomEventInit<T>
        ) {

            super(type);

            this.detail =
                init?.detail as T;

        }

    }


    globalRecord.CustomEvent =
        ReaderCustomEvent as
        unknown as typeof CustomEvent;

    globalRecord.window = {
        localStorage:
            storage,

        dispatchEvent(
            event: Event
        ): boolean {

            dispatchedEvents.push(
                event
            );

            return true;

        }
    };


    return {
        storage,
        dispatchedEvents,

        restore(): void {

            if (
                typeof previousWindow ===
                "undefined"
            ) {

                delete globalRecord.window;

            }
            else {

                globalRecord.window =
                    previousWindow;

            }


            if (
                typeof previousCustomEvent ===
                "undefined"
            ) {

                delete globalRecord.CustomEvent;

            }
            else {

                globalRecord.CustomEvent =
                    previousCustomEvent;

            }

        }
    };

}


test(
    "builds deterministic reader storage keys",
    () => {

        const pathname =
            "/library/guides/example/";

        assert.equal(
            getReaderBookmarkKey(
                pathname
            ),
            getReaderBookmarkKey(
                pathname
            )
        );

        assert.equal(
            getReaderMemoryKey(
                pathname
            ),
            getReaderMemoryKey(
                pathname
            )
        );

        assert.notEqual(
            getReaderBookmarkKey(
                pathname
            ),
            getReaderMemoryKey(
                pathname
            )
        );

    }
);


test(
    "normalizes a valid reader memory record",
    () => {

        const normalized =
            normalizeReaderMemoryRecord({
                version:
                    READER_STORAGE_VERSION,
                pathname:
                    "/example/",
                progress:
                    125,
                scrollY:
                    -40,
                sectionId:
                    "part-1",
                sectionLabel:
                    "Part 1",
                completed:
                    false,
                updatedAt:
                    1000
            });

        assert.ok(
            normalized
        );

        assert.equal(
            normalized.progress,
            100
        );

        assert.equal(
            normalized.scrollY,
            0
        );

        assert.equal(
            normalized.pathname,
            "/example/"
        );

    }
);


test(
    "rejects malformed reader memory records",
    () => {

        assert.equal(
            normalizeReaderMemoryRecord(
                null
            ),
            null
        );

        assert.equal(
            normalizeReaderMemoryRecord({
                version:
                    READER_STORAGE_VERSION,
                pathname:
                    "/example/",
                progress:
                    "50",
                scrollY:
                    100,
                updatedAt:
                    1000
            }),
            null
        );

        assert.equal(
            normalizeReaderMemoryRecord({
                version:
                    READER_STORAGE_VERSION + 1,
                pathname:
                    "/example/",
                progress:
                    50,
                scrollY:
                    100,
                updatedAt:
                    1000
            }),
            null
        );

    }
);


test(
    "writes reads and removes bookmarks through the domain API",
    () => {

        const harness =
            installBrowserHarness();

        try {

            const pathname =
                "/example/";

            const bookmark = {
                pathname,
                title:
                    "Example",
                url:
                    "https://example.com/example/",
                savedAt:
                    1000
            };


            assert.equal(
                writeReaderBookmark(
                    bookmark
                ),
                true
            );

            assert.deepEqual(
                readReaderBookmark(
                    pathname
                ),
                bookmark
            );

            assert.equal(
                removeReaderBookmark(
                    pathname
                ),
                true
            );

            assert.equal(
                readReaderBookmark(
                    pathname
                ),
                null
            );

        }
        finally {

            harness.restore();

        }

    }
);


test(
    "writes reads and removes reader memory through the domain API",
    () => {

        const harness =
            installBrowserHarness();

        try {

            const pathname =
                "/example/";

            const memory = {
                version:
                    READER_STORAGE_VERSION,
                pathname,
                progress:
                    42,
                scrollY:
                    700,
                sectionId:
                    "middle",
                sectionLabel:
                    "Middle",
                completed:
                    false,
                updatedAt:
                    1000
            };


            assert.equal(
                writeReaderMemory(
                    memory
                ),
                true
            );

            assert.deepEqual(
                readReaderMemory(
                    pathname
                ),
                memory
            );

            assert.equal(
                removeReaderMemory(
                    pathname
                ),
                true
            );

            assert.equal(
                readReaderMemory(
                    pathname
                ),
                null
            );

        }
        finally {

            harness.restore();

        }

    }
);


test(
    "completion mutation preserves memory and marks progress complete",
    () => {

        const harness =
            installBrowserHarness();

        try {

            const pathname =
                "/example/";

            const memory = {
                version:
                    READER_STORAGE_VERSION,
                pathname,
                progress:
                    54,
                scrollY:
                    640,
                sectionId:
                    "chapter-two",
                sectionLabel:
                    "Chapter Two",
                completed:
                    false,
                updatedAt:
                    1000
            };


            assert.equal(
                writeReaderMemory(
                    memory
                ),
                true
            );

            assert.equal(
                setReaderMemoryCompletion(
                    pathname,
                    true,
                    999
                ),
                true
            );


            const completed =
                readReaderMemory(
                    pathname
                );

            assert.ok(
                completed
            );

            assert.equal(
                completed.completed,
                true
            );

            assert.equal(
                completed.progress,
                100
            );

            assert.equal(
                completed.scrollY,
                640
            );

            assert.equal(
                completed.sectionId,
                "chapter-two"
            );

            assert.equal(
                completed.sectionLabel,
                "Chapter Two"
            );

        }
        finally {

            harness.restore();

        }

    }
);


test(
    "uncompleting a reader memory record caps progress below completion",
    () => {

        const harness =
            installBrowserHarness();

        try {

            const pathname =
                "/example/";

            const memory = {
                version:
                    READER_STORAGE_VERSION,
                pathname,
                progress:
                    100,
                scrollY:
                    500,
                sectionId:
                    "",
                sectionLabel:
                    "",
                completed:
                    true,
                updatedAt:
                    1000
            };


            assert.equal(
                writeReaderMemory(
                    memory
                ),
                true
            );

            assert.equal(
                setReaderMemoryCompletion(
                    pathname,
                    false,
                    0
                ),
                true
            );


            const reopened =
                readReaderMemory(
                    pathname
                );

            assert.ok(
                reopened
            );

            assert.equal(
                reopened.completed,
                false
            );

            assert.equal(
                reopened.progress,
                95
            );

        }
        finally {

            harness.restore();

        }

    }
);

test(
    "builds a sorted reader data backup",
    () => {

        const harness =
            installBrowserHarness();

        try {

            assert.equal(
                writeReaderBookmark({
                    pathname:
                        "/older/",
                    title:
                        "Older",
                    url:
                        "https://example.com/older/",
                    savedAt:
                        1000
                }),
                true
            );

            assert.equal(
                writeReaderBookmark({
                    pathname:
                        "/newer/",
                    title:
                        "Newer",
                    url:
                        "https://example.com/newer/",
                    savedAt:
                        2000
                }),
                true
            );

            assert.equal(
                writeReaderMemory({
                    version:
                        READER_STORAGE_VERSION,
                    pathname:
                        "/older/",
                    progress:
                        20,
                    scrollY:
                        100,
                    sectionId:
                        "",
                    sectionLabel:
                        "",
                    completed:
                        false,
                    updatedAt:
                        3000
                }),
                true
            );

            assert.equal(
                writeReaderMemory({
                    version:
                        READER_STORAGE_VERSION,
                    pathname:
                        "/newer/",
                    progress:
                        40,
                    scrollY:
                        200,
                    sectionId:
                        "",
                    sectionLabel:
                        "",
                    completed:
                        false,
                    updatedAt:
                        4000
                }),
                true
            );


            const backup =
                buildReaderDataBackup(
                    "https://example.com",
                    5000
                );


            assert.equal(
                backup.exportedAt,
                5000
            );

            assert.equal(
                backup.origin,
                "https://example.com"
            );

            assert.deepEqual(
                backup.bookmarks.map(
                    (
                        bookmark
                    ) =>
                        bookmark.pathname
                ),
                [
                    "/newer/",
                    "/older/"
                ]
            );

            assert.deepEqual(
                backup.readingMemory.map(
                    (
                        memory
                    ) =>
                        memory.pathname
                ),
                [
                    "/newer/",
                    "/older/"
                ]
            );

        }
        finally {

            harness.restore();

        }

    }
);


test(
    "previews only strictly newer reader backup records",
    () => {

        const harness =
            installBrowserHarness();

        try {

            assert.equal(
                writeReaderBookmark({
                    pathname:
                        "/existing/",
                    title:
                        "Existing",
                    url:
                        "https://example.com/existing/",
                    savedAt:
                        2000
                }),
                true
            );

            assert.equal(
                writeReaderMemory({
                    version:
                        READER_STORAGE_VERSION,
                    pathname:
                        "/existing/",
                    progress:
                        40,
                    scrollY:
                        100,
                    sectionId:
                        "",
                    sectionLabel:
                        "",
                    completed:
                        false,
                    updatedAt:
                        3000
                }),
                true
            );


            const preview =
                previewReaderDataImport({
                    format:
                        READER_BACKUP_FORMAT,
                    version:
                        1,
                    exportedAt:
                        9000,
                    origin:
                        "https://backup.example",
                    bookmarks: [
                        {
                            pathname:
                                "/existing/",
                            title:
                                "Equal",
                            url:
                                "https://example.com/existing/",
                            savedAt:
                                2000
                        },
                        {
                            pathname:
                                "/new/",
                            title:
                                "New",
                            url:
                                "https://example.com/new/",
                            savedAt:
                                5000
                        }
                    ],
                    readingMemory: [
                        {
                            version:
                                READER_STORAGE_VERSION,
                            pathname:
                                "/existing/",
                            progress:
                                80,
                            scrollY:
                                400,
                            sectionId:
                                "",
                            sectionLabel:
                                "",
                            completed:
                                false,
                            updatedAt:
                                2500
                        },
                        {
                            version:
                                READER_STORAGE_VERSION,
                            pathname:
                                "/new/",
                            progress:
                                60,
                            scrollY:
                                300,
                            sectionId:
                                "",
                            sectionLabel:
                                "",
                            completed:
                                false,
                            updatedAt:
                                6000
                        }
                    ]
                });


            assert.equal(
                preview.bookmarks,
                2
            );

            assert.equal(
                preview.memory,
                2
            );

            assert.equal(
                preview.newer,
                2
            );

            assert.equal(
                preview.skipped,
                2
            );

        }
        finally {

            harness.restore();

        }

    }
);


test(
    "imports only strictly newer reader backup records",
    () => {

        const harness =
            installBrowserHarness();

        try {

            assert.equal(
                writeReaderBookmark({
                    pathname:
                        "/existing/",
                    title:
                        "Existing",
                    url:
                        "https://example.com/existing/",
                    savedAt:
                        2000
                }),
                true
            );

            assert.equal(
                writeReaderMemory({
                    version:
                        READER_STORAGE_VERSION,
                    pathname:
                        "/existing/",
                    progress:
                        30,
                    scrollY:
                        100,
                    sectionId:
                        "",
                    sectionLabel:
                        "",
                    completed:
                        false,
                    updatedAt:
                        3000
                }),
                true
            );


            const result =
                importReaderDataBackup({
                    format:
                        READER_BACKUP_FORMAT,
                    version:
                        1,
                    exportedAt:
                        9000,
                    origin:
                        "https://backup.example",
                    bookmarks: [
                        {
                            pathname:
                                "/existing/",
                            title:
                                "Older attempt",
                            url:
                                "https://example.com/existing/",
                            savedAt:
                                1500
                        },
                        {
                            pathname:
                                "/new/",
                            title:
                                "Imported",
                            url:
                                "https://example.com/new/",
                            savedAt:
                                5000
                        }
                    ],
                    readingMemory: [
                        {
                            version:
                                READER_STORAGE_VERSION,
                            pathname:
                                "/existing/",
                            progress:
                                10,
                            scrollY:
                                50,
                            sectionId:
                                "",
                            sectionLabel:
                                "",
                            completed:
                                false,
                            updatedAt:
                                2500
                        },
                        {
                            version:
                                READER_STORAGE_VERSION,
                            pathname:
                                "/new/",
                            progress:
                                70,
                            scrollY:
                                500,
                            sectionId:
                                "part-two",
                            sectionLabel:
                                "Part Two",
                            completed:
                                false,
                            updatedAt:
                                6000
                        }
                    ]
                });


            assert.deepEqual(
                result,
                {
                    imported:
                        2,
                    skipped:
                        2,
                    failed:
                        0
                }
            );


            assert.equal(
                readReaderBookmark(
                    "/existing/"
                )?.title,
                "Existing"
            );

            assert.equal(
                readReaderBookmark(
                    "/new/"
                )?.title,
                "Imported"
            );

            assert.equal(
                readReaderMemory(
                    "/existing/"
                )?.progress,
                30
            );

            assert.equal(
                readReaderMemory(
                    "/new/"
                )?.progress,
                70
            );


            const importEvents =
                harness.dispatchedEvents.filter(
                    (
                        event
                    ) =>
                        event.type ===
                        "river:reader-data-changed"
                );

            assert.equal(
                importEvents.length,
                1
            );

        }
        finally {

            harness.restore();

        }

    }
);
