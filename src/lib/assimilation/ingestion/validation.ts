import type {
    FileSystemSourceIngestionRequest
} from "./types";


export function assertFileSystemSourceIngestionRequest(
    value: unknown
): asserts value is FileSystemSourceIngestionRequest {

    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(
            value
        )
    ) {

        throw new TypeError(
            "Production source request must be a JSON object."
        );

    }

    const request =
        value as
            Record<string, unknown>;

    if (
        typeof request.content !==
            "string" &&
        !(
            request.content instanceof
                Uint8Array
        )
    ) {

        throw new TypeError(
            'Production source request field "content" must be a string or Uint8Array.'
        );

    }

    if (
        typeof request.assetType !==
            "string" ||
        request.assetType.length ===
            0
    ) {

        throw new TypeError(
            'Production source request field "assetType" must be a non-empty string.'
        );

    }

    if (
        typeof request.originalFilename !==
            "string" ||
        request.originalFilename.length ===
            0
    ) {

        throw new TypeError(
            'Production source request field "originalFilename" must be a non-empty string.'
        );

    }

    if (
        request.ownership ===
            null ||
        typeof request.ownership !==
            "object" ||
        Array.isArray(
            request.ownership
        )
    ) {

        throw new TypeError(
            'Production source request field "ownership" must be an object.'
        );

    }

    if (
        request.usagePermission ===
            null ||
        typeof request.usagePermission !==
            "object" ||
        Array.isArray(
            request.usagePermission
        )
    ) {

        throw new TypeError(
            'Production source request field "usagePermission" must be an object.'
        );

    }

}
