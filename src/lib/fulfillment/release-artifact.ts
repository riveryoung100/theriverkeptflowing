import {
    createHash
} from "node:crypto";

import {
    mkdir,
    readFile,
    writeFile
} from "node:fs/promises";

import {
    basename,
    dirname,
    extname,
    isAbsolute,
    relative,
    resolve
} from "node:path";

import {
    PDFDocument,
    StandardFonts,
    rgb
} from "pdf-lib";

import type {
    ProductRelease,
    ProductReleaseStatus
} from "./types";


export interface ProductReleaseArtifactInput {

    productId:
        string;

    productVersion:
        string;

    releaseId:
        string;

    sourceManuscriptPath:
        string;

    outputDirectory:
        string;

    artifactFilename:
        string;

    releaseStatus:
        ProductReleaseStatus;

    expectedSourceSha256?:
        string;

    createdAt?:
        string;

}


export interface ProductReleaseArtifactResult {

    release:
        ProductRelease;

    artifactPath:
        string;

    manifestPath:
        string;

}


const PROHIBITED_OUTPUT_DIRECTORIES =
    [
        "public",
        "dist"
    ] as const;


function normalizePrintableText(
    value:
        string
): string {

    return value
        .replace(/\u2014/g, "--")
        .replace(/\u2013/g, "-")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/\u2026/g, "...")
        .replace(/\u00a0/g, " ")
        .replace(/\t/g, "    ")
        .replace(/[^\x20-\x7E]/g, "?");

}


function stripFrontmatter(
    markdown:
        string
): string {

    const normalized =
        markdown.replace(
            /\r\n/g,
            "\n"
        );

    if (
        !normalized.startsWith(
            "---\n"
        )
    ) {
        return normalized;
    }

    const closingBoundary =
        normalized.indexOf(
            "\n---\n",
            4
        );

    if (
        closingBoundary ===
        -1
    ) {
        return normalized;
    }

    return normalized.slice(
        closingBoundary + 5
    );

}


function markdownToReadableLines(
    markdown:
        string
): string[] {

    const withoutFrontmatter =
        stripFrontmatter(
            markdown
        );

    return withoutFrontmatter
        .split(/\r?\n/)
        .map(
            line =>
                line
                    .replace(
                        /^\s{0,3}#{1,6}\s+/,
                        ""
                    )
                    .replace(
                        /^\s*[-*+]\s+/,
                        "• "
                    )
                    .replace(
                        /^\s*\d+\.\s+/,
                        ""
                    )
                    .replace(
                        /\*\*(.*?)\*\*/g,
                        "$1"
                    )
                    .replace(
                        /\*(.*?)\*/g,
                        "$1"
                    )
                    .replace(
                        /`([^`]+)`/g,
                        "$1"
                    )
                    .replace(
                        /\[([^\]]+)\]\([^)]+\)/g,
                        "$1"
                    )
        )
        .map(
            normalizePrintableText
        );

}


function wrapLine(
    text:
        string,
    maxCharacters:
        number
): string[] {

    const trimmed =
        text.trim();

    if (
        trimmed.length ===
        0
    ) {
        return [""];
    }

    const words =
        trimmed.split(
            /\s+/
        );

    const lines:
        string[] =
        [];

    let current =
        "";

    for (
        const word of words
    ) {

        const candidate =
            current.length === 0
                ? word
                : `${current} ${word}`;

        if (
            candidate.length <=
            maxCharacters
        ) {
            current =
                candidate;

            continue;
        }

        if (
            current.length >
            0
        ) {
            lines.push(
                current
            );
        }

        current =
            word;

    }

    if (
        current.length >
        0
    ) {
        lines.push(
            current
        );
    }

    return lines;

}


function assertNonEmpty(
    name:
        string,
    value:
        string
): void {

    if (
        value.trim().length ===
        0
    ) {
        throw new Error(
            `${name} must not be empty.`
        );
    }

}


function isInside(
    parent:
        string,
    candidate:
        string
): boolean {

    const difference =
        relative(
            parent,
            candidate
        );

    return (
        difference ===
            "" ||
        (
            !difference.startsWith(
                ".."
            ) &&
            !isAbsolute(
                difference
            )
        )
    );

}


function assertPrivateOutputPath(
    outputDirectory:
        string
): void {

    const resolvedOutput =
        resolve(
            outputDirectory
        );

    const repositoryRoot =
        resolve(
            process.cwd()
        );

    for (
        const prohibitedDirectory
        of PROHIBITED_OUTPUT_DIRECTORIES
    ) {

        const prohibitedPath =
            resolve(
                repositoryRoot,
                prohibitedDirectory
            );

        if (
            isInside(
                prohibitedPath,
                resolvedOutput
            )
        ) {
            throw new Error(
                `Release artifacts must not be written beneath ${prohibitedDirectory}/.`
            );
        }

    }

}


async function createPdfBytes(
    markdown:
        string
): Promise<Uint8Array> {

    const document =
        await PDFDocument.create();

    const font =
        await document.embedFont(
            StandardFonts.Helvetica
        );

    const boldFont =
        await document.embedFont(
            StandardFonts.HelveticaBold
        );

    document.setTitle(
        "The River Life Operating System"
    );

    document.setAuthor(
        "River Young"
    );

    document.setSubject(
        "River product release artifact"
    );

    const pageWidth =
        612;

    const pageHeight =
        792;

    const margin =
        54;

    const fontSize =
        10.5;

    const lineHeight =
        15;

    const headingSize =
        15;

    const lines =
        markdownToReadableLines(
            markdown
        );

    let page =
        document.addPage([
            pageWidth,
            pageHeight
        ]);

    let cursorY =
        pageHeight -
        margin;

    for (
        const originalLine of lines
    ) {

        const sourceLine =
            originalLine.trimEnd();

        const isHeading =
            sourceLine.length > 0 &&
            !originalLine.startsWith(
                " "
            ) &&
            (
                originalLine.startsWith(
                    "#"
                ) ||
                /^[A-Z][A-Za-z0-9 '&/(),.-]{2,80}$/.test(
                    sourceLine
                )
            );

        const wrapped =
            wrapLine(
                sourceLine.replace(
                    /^#+\s*/,
                    ""
                ),
                isHeading
                    ? 58
                    : 86
            );

        if (
            sourceLine.length ===
            0
        ) {
            cursorY -=
                lineHeight * 0.65;

            continue;
        }

        for (
            const wrappedLine of wrapped
        ) {

            const requiredHeight =
                isHeading
                    ? headingSize + 7
                    : lineHeight;

            if (
                cursorY -
                requiredHeight <
                margin
            ) {

                page =
                    document.addPage([
                        pageWidth,
                        pageHeight
                    ]);

                cursorY =
                    pageHeight -
                    margin;
            }

            page.drawText(
                normalizePrintableText(
                    wrappedLine
                ),
                {
                    x:
                        margin,
                    y:
                        cursorY,
                    size:
                        isHeading
                            ? headingSize
                            : fontSize,
                    font:
                        isHeading
                            ? boldFont
                            : font,
                    color:
                        rgb(
                            0,
                            0,
                            0
                        )
                }
            );

            cursorY -=
                requiredHeight;

        }

        if (
            isHeading
        ) {
            cursorY -=
                5;
        }

    }

    return document.save();

}


export async function buildProductReleaseArtifact(
    input:
        ProductReleaseArtifactInput
): Promise<ProductReleaseArtifactResult> {

    assertNonEmpty(
        "productId",
        input.productId
    );

    assertNonEmpty(
        "productVersion",
        input.productVersion
    );

    assertNonEmpty(
        "releaseId",
        input.releaseId
    );

    assertNonEmpty(
        "sourceManuscriptPath",
        input.sourceManuscriptPath
    );

    assertNonEmpty(
        "outputDirectory",
        input.outputDirectory
    );

    assertNonEmpty(
        "artifactFilename",
        input.artifactFilename
    );

    if (
        extname(
            input.artifactFilename
        ).toLowerCase() !==
        ".pdf"
    ) {
        throw new Error(
            "V1 product release artifact must use PDF format."
        );
    }

    if (
        basename(
            input.artifactFilename
        ) !==
        input.artifactFilename
    ) {
        throw new Error(
            "artifactFilename must be a filename, not a path."
        );
    }

    assertPrivateOutputPath(
        input.outputDirectory
    );

    const sourcePath =
        resolve(
            input.sourceManuscriptPath
        );

    const sourceBytes =
        await readFile(
            sourcePath
        );

    if (
        sourceBytes.byteLength ===
        0
    ) {
        throw new Error(
            "Source manuscript must not be empty."
        );
    }

    if (
        input.releaseStatus ===
        "approved"
    ) {

        assertNonEmpty(
            "expectedSourceSha256",
            input.expectedSourceSha256 ??
                ""
        );

        const canonicalSourceBytes =
            Buffer.from(
                sourceBytes
                    .toString(
                        "utf8"
                    )
                    .replace(
                        /\r\n/g,
                        "\n"
                    ),
                "utf8"
            );

        const sourceSha256 =
            createHash(
                "sha256"
            )
                .update(
                    canonicalSourceBytes
                )
                .digest(
                    "hex"
                );

        if (
            sourceSha256 !==
            input.expectedSourceSha256
                ?.toLowerCase()
        ) {
            throw new Error(
                "Approved release source manuscript does not match the expected authoritative SHA-256."
            );
        }
    }

    const sourceMarkdown =
        sourceBytes.toString(
            "utf8"
        );

    const pdfBytes =
        await createPdfBytes(
            sourceMarkdown
        );

    const artifactSha256 =
        createHash(
            "sha256"
        )
            .update(
                pdfBytes
            )
            .digest(
                "hex"
            );

    const createdAt =
        input.createdAt ??
        new Date().toISOString();

    const createdDate =
        new Date(
            createdAt
        );

    if (
        Number.isNaN(
            createdDate.getTime()
        )
    ) {
        throw new Error(
            "createdAt must be a valid ISO-compatible timestamp."
        );
    }

    const release:
        ProductRelease =
        {
            productId:
                input.productId,

            productVersion:
                input.productVersion,

            releaseId:
                input.releaseId,

            artifactFilename:
                input.artifactFilename,

            artifactFormat:
                "PDF",

            artifactByteSize:
                pdfBytes.byteLength,

            artifactSha256,

            createdAt:
                createdDate.toISOString(),

            releaseStatus:
                input.releaseStatus
        };

    const outputDirectory =
        resolve(
            input.outputDirectory
        );

    const artifactPath =
        resolve(
            outputDirectory,
            input.artifactFilename
        );

    const manifestPath =
        resolve(
            outputDirectory,
            `${input.releaseId}.release.json`
        );

    if (
        !isInside(
            outputDirectory,
            artifactPath
        )
    ) {
        throw new Error(
            "Resolved artifact path escaped the release output directory."
        );
    }

    await mkdir(
        dirname(
            artifactPath
        ),
        {
            recursive:
                true
        }
    );

    await writeFile(
        artifactPath,
        pdfBytes
    );

    await writeFile(
        manifestPath,
        `${JSON.stringify(
            release,
            null,
            4
        )}\n`,
        "utf8"
    );

    return {
        release,
        artifactPath,
        manifestPath
    };

}
