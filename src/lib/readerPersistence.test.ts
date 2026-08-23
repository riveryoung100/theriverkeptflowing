import assert from "node:assert/strict";
import test from "node:test";

import {
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
    setReaderMemoryCompletion
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