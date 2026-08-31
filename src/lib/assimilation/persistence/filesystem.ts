import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import type {
    AssetClassification,
    AssetExtraction,
    AssetSegment,
    DerivedObjectReference,
    SourceAsset,
    TransformationRecord
} from "../types";


export interface AssimilationGeneratedRecordSet {

    readonly asset:
        SourceAsset;

    readonly extraction:
        AssetExtraction;

    readonly segment:
        AssetSegment;

    readonly classification:
        AssetClassification;

    readonly transformation:
        TransformationRecord;

    readonly derivedObject:
        DerivedObjectReference;

}


export interface AssimilationGeneratedRecordPersistence {

    persist(
        records: AssimilationGeneratedRecordSet
    ): Promise<string>;

}


function resolveGeneratedRecordPath(
    rootDirectory: string,
    assetId: string
): string {

    const generatedRoot =
        resolve(
            rootDirectory,
            "generated-records"
        );

    const encodedAssetId =
        encodeURIComponent(assetId);

    const candidate =
        resolve(
            generatedRoot,
            `${encodedAssetId}.json`
        );

    if (
        candidate !== generatedRoot &&
        !candidate.startsWith(
            `${generatedRoot}${sep}`
        )
    ) {

        throw new TypeError(
            "Generated assimilation record path escaped the configured persistence root."
        );
    }

    return candidate;
}


export class FileSystemAssimilationGeneratedRecordPersistence
implements AssimilationGeneratedRecordPersistence {

    public constructor(
        private readonly rootDirectory: string
    ) {

        if (
            typeof rootDirectory !== "string" ||
            rootDirectory.trim().length === 0
        ) {

            throw new TypeError(
                "Assimilation generated-record persistence root is required."
            );
        }
    }


    public async persist(
        records: AssimilationGeneratedRecordSet
    ): Promise<string> {

        const targetPath =
            resolveGeneratedRecordPath(
                this.rootDirectory,
                records.asset.id
            );

        const temporaryPath =
            `${targetPath}.tmp`;

        await mkdir(
            dirname(targetPath),
            { recursive: true }
        );

        try {

            await writeFile(
                temporaryPath,
                JSON.stringify(records, null, 2) + "\n",
                "utf8"
            );

            await writeFile(
                targetPath,
                await readFile(temporaryPath),
                { flag: "wx" }
            );

            await rm(
                temporaryPath,
                { force: true }
            );

            return targetPath;

        } catch (error) {

            await rm(
                temporaryPath,
                { force: true }
            );

            throw error;
        }
    }

}


export function createFileSystemAssimilationGeneratedRecordPersistence(
    rootDirectory: string
): AssimilationGeneratedRecordPersistence {

    return new FileSystemAssimilationGeneratedRecordPersistence(
        rootDirectory
    );
}
