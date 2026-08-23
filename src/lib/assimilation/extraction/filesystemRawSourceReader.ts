import {
    readFile
} from "node:fs/promises";

import {
    isAbsolute,
    relative,
    resolve
} from "node:path";

import type {
    StorageReference
} from "../types";

import type {
    RawSourceContent,
    RawSourceReader
} from "./types";


function isWithinRoot(
    rootDirectory: string,
    candidatePath: string
): boolean {

    const relativePath =
        relative(
            rootDirectory,
            candidatePath
        );

    return (
        relativePath === "" ||
        (
            !relativePath.startsWith("..") &&
            !isAbsolute(relativePath)
        )
    );
}


export class FileSystemRawSourceReader
implements RawSourceReader {

    private readonly rootDirectory:
        string;


    public constructor(
        rootDirectory: string
    ) {

        this.rootDirectory =
            resolve(
                rootDirectory
            );
    }


    public async read(
        storage: StorageReference
    ): Promise<RawSourceContent | null> {

        if (
            storage.provider !==
            "filesystem"
        ) {
            return null;
        }

        const candidatePath =
            storage.bucket
                ? resolve(
                    this.rootDirectory,
                    storage.bucket,
                    storage.key
                )
                : resolve(
                    this.rootDirectory,
                    storage.key
                );

        if (
            !isWithinRoot(
                this.rootDirectory,
                candidatePath
            )
        ) {
            return null;
        }

        try {

            const text =
                await readFile(
                    candidatePath,
                    "utf8"
                );

            return {
                text
            };
        }
        catch {

            return null;
        }
    }
}
