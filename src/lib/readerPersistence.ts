export const READER_BOOKMARK_PREFIX =
    "river-reading-bookmark:";

export const READER_MEMORY_PREFIX =
    "river-reading-memory:";

export const READER_STORAGE_VERSION =
    1;

export const READER_BACKUP_FORMAT =
    "the-river-kept-flowing-reader-data";

export const READER_BACKUP_VERSION =
    1;




export const READER_DATA_CHANGED_EVENT =
    "river:reader-data-changed";


export type ReaderDataChangeKind =
    | "bookmark"
    | "memory"
    | "import";


export interface ReaderDataChangeDetail {
    kind: ReaderDataChangeKind;
    pathname?: string;
}


export function dispatchReaderDataChanged(
    detail: ReaderDataChangeDetail
): void {

    window.dispatchEvent(
        new CustomEvent<ReaderDataChangeDetail>(
            READER_DATA_CHANGED_EVENT,
            {
                detail
            }
        )
    );

}
export interface ReaderBookmarkRecord {
    pathname: string;
    title: string;
    url: string;
    savedAt: number;
}


export interface ReaderMemoryRecord {
    version?: number;
    pathname?: string;
    progress?: number;
    scrollY?: number;
    sectionId?: string;
    sectionLabel?: string;
    completed?: boolean;
    updatedAt?: number;
}


export interface ValidatedReaderMemoryRecord {
    version: number;
    pathname: string;
    progress: number;
    scrollY: number;
    sectionId: string;
    sectionLabel: string;
    completed: boolean;
    updatedAt: number;
}


export interface ReaderDataBackup {
    format:
        typeof READER_BACKUP_FORMAT;
    version:
        typeof READER_BACKUP_VERSION;
    exportedAt:
        number;
    origin:
        string;
    bookmarks:
        ReaderBookmarkRecord[];
    readingMemory:
        ReaderMemoryRecord[];
}


export function getReaderStorageKey(
    prefix: string,
    pathname: string
): string {

    return (
        prefix +
        pathname
    );
}


export function getReaderBookmarkKey(
    pathname: string
): string {

    return getReaderStorageKey(
        READER_BOOKMARK_PREFIX,
        pathname
    );
}


export function getReaderMemoryKey(
    pathname: string
): string {

    return getReaderStorageKey(
        READER_MEMORY_PREFIX,
        pathname
    );
}


export function safelyListReaderStorageKeys(): string[] {

    try {

        const keys: string[] =
            [];

        for (
            let index = 0;
            index < window.localStorage.length;
            index += 1
        ) {

            const key =
                window.localStorage.key(
                    index
                );

            if (key !== null) {

                keys.push(
                    key
                );

            }

        }

        return keys;

    }
    catch {

        return [];

    }

}

export function safelyReadReaderStorage(
    key: string
): string | null {

    try {

        return window.localStorage.getItem(
            key
        );

    }
    catch {

        return null;

    }

}


export function safelyWriteReaderStorage(
    key: string,
    value: string
): boolean {

    try {

        window.localStorage.setItem(
            key,
            value
        );

        return true;

    }
    catch {

        return false;

    }

}


export function safelyRemoveReaderStorage(
    key: string
): boolean {

    try {

        window.localStorage.removeItem(
            key
        );

        return true;

    }
    catch {

        return false;

    }

}

function isFiniteReaderNumber(
    value: unknown
): value is number {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );

}


export function parseReaderBookmarkRecord(
    value: unknown
): ReaderBookmarkRecord | null {

    if (
        typeof value !== "object" ||
        value === null
    ) {

        return null;

    }


    const record =
        value as Partial<ReaderBookmarkRecord>;


    if (
        typeof record.pathname !== "string" ||
        !record.pathname.startsWith("/") ||
        typeof record.title !== "string" ||
        typeof record.url !== "string" ||
        !isFiniteReaderNumber(record.savedAt)
    ) {

        return null;

    }


    return {
        pathname:
            record.pathname,
        title:
            record.title,
        url:
            record.url,
        savedAt:
            record.savedAt
    };

}


export function parseReaderMemoryRecord(
    value: unknown
): ReaderMemoryRecord | null {

    if (
        typeof value !== "object" ||
        value === null
    ) {

        return null;

    }


    const record =
        value as Partial<ReaderMemoryRecord>;


    if (
        record.version !== READER_STORAGE_VERSION ||
        typeof record.pathname !== "string" ||
        !record.pathname.startsWith("/") ||
        !isFiniteReaderNumber(record.updatedAt) ||
        !isFiniteReaderNumber(record.progress) ||
        !isFiniteReaderNumber(record.scrollY)
    ) {

        return null;

    }


    return {
        version:
            READER_STORAGE_VERSION,
        pathname:
            record.pathname,
        progress:
            Math.min(
                100,
                Math.max(
                    0,
                    record.progress
                )
            ),
        scrollY:
            Math.max(
                0,
                record.scrollY
            ),
        sectionId:
            typeof record.sectionId === "string"
                ? record.sectionId
                : "",
        sectionLabel:
            typeof record.sectionLabel === "string"
                ? record.sectionLabel
                : "",
        completed:
            record.completed ?? false,
        updatedAt:
            record.updatedAt
    };

}


export function parseReaderMemoryStorage(
    value: string | null
): ReaderMemoryRecord | null {

    if (!value) {

        return null;

    }


    try {

        const parsed =
            JSON.parse(value) as unknown;

        return parseReaderMemoryRecord(
            parsed
        );

    }
    catch {

        return null;

    }

}


export function parseReaderDataBackup(
    value: unknown
): ReaderDataBackup | null {

    if (
        typeof value !== "object" ||
        value === null
    ) {

        return null;

    }


    const backup =
        value as Partial<ReaderDataBackup>;


    if (
        backup.format !== READER_BACKUP_FORMAT ||
        backup.version !== READER_BACKUP_VERSION ||
        !Array.isArray(backup.bookmarks) ||
        !Array.isArray(backup.readingMemory)
    ) {

        return null;

    }


    const bookmarks =
        backup.bookmarks
            .map(
                (record) =>
                    parseReaderBookmarkRecord(record)
            )
            .filter(
                (
                    record
                ): record is ReaderBookmarkRecord =>
                    record !== null
            );

    const readingMemory =
        backup.readingMemory
            .map(
                (value) => {

                    if (
                        typeof value !== "object" ||
                        value === null
                    ) {

                        return null;

                    }


                    const record =
                        value as Partial<ReaderMemoryRecord>;


                    if (
                        typeof record.pathname !== "string" ||
                        !record.pathname.startsWith("/") ||
                        !isFiniteReaderNumber(record.updatedAt)
                    ) {

                        return null;

                    }


                    if (
                        record.progress !== undefined &&
                        !isFiniteReaderNumber(record.progress)
                    ) {

                        return null;

                    }


                    if (
                        record.scrollY !== undefined &&
                        !isFiniteReaderNumber(record.scrollY)
                    ) {

                        return null;

                    }


                    return {
                        version:
                            isFiniteReaderNumber(record.version)
                                ? record.version
                                : 1,
                        pathname:
                            record.pathname,
                        progress:
                            isFiniteReaderNumber(record.progress)
                                ? Math.min(
                                    100,
                                    Math.max(
                                        0,
                                        record.progress
                                    )
                                )
                                : 0,
                        scrollY:
                            isFiniteReaderNumber(record.scrollY)
                                ? Math.max(
                                    0,
                                    record.scrollY
                                )
                                : 0,
                        sectionId:
                            typeof record.sectionId === "string"
                                ? record.sectionId
                                : "",
                        sectionLabel:
                            typeof record.sectionLabel === "string"
                                ? record.sectionLabel
                                : "",
                        completed:
                            record.completed === true,
                        updatedAt:
                            record.updatedAt
                    };

                }
            )
            .filter(
                (
                    record
                ): record is NonNullable<typeof record> =>
                    record !== null
            );


    return {
        format:
            READER_BACKUP_FORMAT,
        version:
            READER_BACKUP_VERSION,
        exportedAt:
            isFiniteReaderNumber(
                backup.exportedAt
            )
                ? backup.exportedAt
                : Date.now(),
        origin:
            typeof backup.origin === "string"
                ? backup.origin
                : "",
        bookmarks,
        readingMemory
    };

}
export function readReaderBookmark(
    pathname: string
): ReaderBookmarkRecord | null {

    const key =
        getReaderBookmarkKey(pathname);

    const stored =
        safelyReadReaderStorage(key);

    if (!stored) {

        return null;
    }


    try {

        const parsed =
            JSON.parse(stored);

        return parseReaderBookmarkRecord(
            parsed
        );
    }
    catch {

        return null;
    }

}


export function normalizeReaderMemoryRecord(
    value: unknown
): ReaderMemoryRecord | null {

    if (
        typeof value !== "object" ||
        value === null
    ) {

        return null;
    }


    const record =
        value as Partial<ReaderMemoryRecord>;


    if (
        record.version !==
            READER_STORAGE_VERSION ||
        typeof record.pathname !==
            "string" ||
        typeof record.progress !==
            "number" ||
        !Number.isFinite(
            record.progress
        ) ||
        typeof record.scrollY !==
            "number" ||
        !Number.isFinite(
            record.scrollY
        ) ||
        typeof record.updatedAt !==
            "number" ||
        !Number.isFinite(
            record.updatedAt
        )
    ) {

        return null;
    }


    return {
        version:
            READER_STORAGE_VERSION,
        pathname:
            record.pathname,
        progress:
            Math.min(
                100,
                Math.max(
                    0,
                    record.progress
                )
            ),
        scrollY:
            Math.max(
                0,
                record.scrollY
            ),
        sectionId:
            typeof record.sectionId ===
                "string"
                ? record.sectionId
                : "",
        sectionLabel:
            typeof record.sectionLabel ===
                "string"
                ? record.sectionLabel
                : "",
        completed:
            record.completed === true,
        updatedAt:
            record.updatedAt
    };

}

export function readReaderMemory(
    pathname: string
): ReaderMemoryRecord | null {

    const stored =
        safelyReadReaderStorage(
            getReaderMemoryKey(pathname)
        );

    if (!stored) {

        return null;
    }


    try {

        return normalizeReaderMemoryRecord(
            JSON.parse(stored)
        );
    }
    catch {

        return null;
    }

}


export function writeReaderBookmark(
    bookmark: ReaderBookmarkRecord
): boolean {

    const parsed =
        parseReaderBookmarkRecord(
            bookmark
        );

    if (!parsed) {

        return false;
    }


    return safelyWriteReaderStorage(
        getReaderBookmarkKey(
            parsed.pathname
        ),
        JSON.stringify(
            parsed
        )
    );

}


export function writeReaderMemory(
    memory: ReaderMemoryRecord
): boolean {

    const parsed =
        parseReaderMemoryRecord(
            memory
        );

    if (
        !parsed ||
        typeof parsed.pathname !==
            "string"
    ) {

        return false;
    }


    return safelyWriteReaderStorage(
        getReaderMemoryKey(
            parsed.pathname
        ),
        JSON.stringify(
            parsed
        )
    );

}


export function removeReaderBookmark(
    pathname: string
): boolean {

    return safelyRemoveReaderStorage(
        getReaderBookmarkKey(pathname)
    );

}



export function setReaderMemoryCompletion(
    pathname: string,
    completed: boolean,
    fallbackScrollY = 0
): boolean {

    const existing =
        readReaderMemory(pathname);


    const updated:
        ReaderMemoryRecord = {

        version:
            READER_STORAGE_VERSION,

        pathname,

        progress:
            completed
                ? 100
                : Math.min(
                    existing?.progress ??
                        0,
                    95
                ),

        scrollY:
            existing?.scrollY ??
            Math.max(
                0,
                fallbackScrollY
            ),

        sectionId:
            existing?.sectionId ??
            "",

        sectionLabel:
            existing?.sectionLabel ??
            "",

        completed,

        updatedAt:
            Date.now()

    };


    const written =
        writeReaderMemory(
            updated
        );


    if (written) {

        dispatchReaderDataChanged({
            kind:
                "memory",
            pathname
        });
    }


    return written;

}

export function removeReaderMemory(
    pathname: string
): boolean {

    return safelyRemoveReaderStorage(
        getReaderMemoryKey(pathname)
    );

}


export function listReaderBookmarks():
    ReaderBookmarkRecord[] {

    const bookmarks:
        ReaderBookmarkRecord[] =
        [];


    for (
        const key of
        safelyListReaderStorageKeys()
    ) {

        if (
            !key.startsWith(
                READER_BOOKMARK_PREFIX
            )
        ) {

            continue;
        }


        const stored =
            safelyReadReaderStorage(key);

        if (!stored) {

            continue;
        }


        try {

            const bookmark =
                parseReaderBookmarkRecord(
                    JSON.parse(stored)
                );

            if (bookmark) {

                bookmarks.push(
                    bookmark
                );
            }
        }
        catch {

            continue;
        }
    }


    return bookmarks;

}


export function listReaderMemory():
    ReaderMemoryRecord[] {

    const memory:
        ReaderMemoryRecord[] =
        [];


    for (
        const key of
        safelyListReaderStorageKeys()
    ) {

        if (
            !key.startsWith(
                READER_MEMORY_PREFIX
            )
        ) {

            continue;
        }


        const parsed =
            parseReaderMemoryStorage(
                safelyReadReaderStorage(key)
            );

        if (parsed) {

            memory.push(
                parsed
            );
        }
    }


    return memory;

}


export function readReaderRecordTimestamp(
    key: string,
    field:
        "savedAt" |
        "updatedAt"
): number {

    const stored =
        safelyReadReaderStorage(key);

    if (!stored) {

        return 0;
    }


    try {

        const parsed =
            JSON.parse(
                stored
            ) as Record<string, unknown>;

        const value =
            parsed[field];

        return (
            typeof value ===
                "number" &&
            Number.isFinite(value)
        )
            ? value
            : 0;
    }
    catch {

        return 0;
    }

}
