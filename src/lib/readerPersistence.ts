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
