import {
    readFile
} from "node:fs/promises";

import {
    isAbsolute,
    relative,
    resolve,
    sep
} from "node:path";

import type {
    StorageReference
} from "../types";

import type {
    BinaryRawSourceContent,
    BinaryRawSourceReader
} from "./types";


export class FileSystemBinaryRawSourceReader
implements BinaryRawSourceReader {

    private readonly rootDirectory:
        string;


    constructor(
        rootDirectory:
            string
    ) {

        this.rootDirectory =
            resolve(
                rootDirectory
            );

    }


    public async read(
        storage:
            StorageReference
    ): Promise<BinaryRawSourceContent | null> {

        if (
            storage.provider !==
            "filesystem"
        ) {
            return null;
        }

        if (
            isAbsolute(
                storage.key
            )
        ) {
            return null;
        }

        const sourcePath =
            resolve(
                this.rootDirectory,
                storage.key
            );

        const relativeSourcePath =
            relative(
                this.rootDirectory,
                sourcePath
            );

        if (
            relativeSourcePath.length ===
                0 ||
            relativeSourcePath ===
                ".." ||
            relativeSourcePath.startsWith(
                `..${sep}`
            ) ||
            isAbsolute(
                relativeSourcePath
            )
        ) {
            return null;
        }

        try {

            const bytes =
                await readFile(
                    sourcePath
                );

            return {
                bytes:
                    new Uint8Array(
                        bytes
                    )
            };

        }
        catch {

            return null;

        }

    }

}
