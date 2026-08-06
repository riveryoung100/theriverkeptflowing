export type RiverDevRepairOutcome =
    | "repaired"
    | "already-passing"
    | "attempts-exhausted"
    | "blocked"
    | "unsupported-failure";


export interface RiverDevRepairLoopSpecification {

    readonly version:
        string;

    readonly id:
        string;

    readonly name:
        string;

    readonly objective:
        string;

    readonly branch:
        string;

    readonly maximumRepairAttempts:
        number;

    readonly allowedPaths:
        readonly string[];

    readonly requirements: {

        readonly verificationRequiredBeforeRepair:
            boolean;

        readonly repairManifestRequired:
            boolean;

        readonly scopeValidationRequired:
            boolean;

        readonly reviewRequiredAfterRepair:
            boolean;

        readonly verificationRequiredAfterRepair:
            boolean;

        readonly dryRunDefault:
            boolean;

        readonly pushAllowed:
            boolean;

        readonly commitAllowed:
            boolean;

        readonly outsideRepositoryAllowed:
            boolean;

        readonly stopOnUnknownFailure:
            boolean;

        readonly stopWhenAttemptsExhausted:
            boolean;

    };

    readonly repairOutcomes:
        readonly RiverDevRepairOutcome[];

    readonly qualityGates:
        readonly string[];

}


export interface RiverDevRepairVerificationResult {

    readonly passed:
        boolean;

    readonly failureCode?:
        string;

    readonly message:
        string;

}


export interface RiverDevRepairManifest {

    readonly id:
        string;

    readonly failureCode:
        string;

    readonly paths:
        readonly string[];

    readonly description:
        string;

}


export interface RiverDevRepairAttempt {

    readonly attempt:
        number;

    readonly failureCode:
        string;

    readonly manifestId:
        string;

    readonly dryRun:
        boolean;

    readonly applied:
        boolean;

    readonly verificationPassed:
        boolean;

    readonly reviewPassed:
        boolean;

    readonly message:
        string;

}


export interface RiverDevRepairLoopRequest {

    readonly specification:
        RiverDevRepairLoopSpecification;

    readonly dryRun?:
        boolean;

}


export interface RiverDevRepairLoopResult {

    readonly specificationId:
        string;

    readonly branch:
        string;

    readonly outcome:
        RiverDevRepairOutcome;

    readonly passed:
        boolean;

    readonly dryRun:
        boolean;

    readonly attempts:
        readonly RiverDevRepairAttempt[];

    readonly finalVerification:
        RiverDevRepairVerificationResult;

    readonly warnings:
        readonly string[];

}


export interface RiverDevRepairLoopDependencies {

    readonly getCurrentBranch:
        () => Promise<string>;

    readonly verify:
        () => Promise<RiverDevRepairVerificationResult>;

    readonly resolveManifest:
        (
            failureCode: string
        ) =>
            Promise<RiverDevRepairManifest | undefined>;

    readonly applyManifest:
        (
            manifest: RiverDevRepairManifest,
            dryRun: boolean
        ) => Promise<void>;

    readonly review:
        (
            manifest: RiverDevRepairManifest
        ) => Promise<boolean>;

}


function normalizePath(
    path: string
): string {

    return path
        .replaceAll(
            "\\",
            "/"
        )
        .replace(
            /^\.\/+/,
            ""
        )
        .replace(
            /\/+$/,
            ""
        );

}


function isPathAllowed(
    path: string,
    allowedPaths: readonly string[]
): boolean {

    const normalizedPath =
        normalizePath(
            path
        );

    return allowedPaths.some(
        (allowedPath) => {

            const normalizedAllowedPath =
                normalizePath(
                    allowedPath
                );

            return (
                normalizedPath ===
                    normalizedAllowedPath ||
                normalizedPath.startsWith(
                    `${normalizedAllowedPath}/`
                )
            );

        }
    );

}


export function validateRepairLoopSpecification(
    specification:
        RiverDevRepairLoopSpecification
): void {

    if (
        specification.id.trim().length ===
        0
    ) {
        throw new TypeError(
            "Repair-loop specification identifier cannot be empty."
        );
    }

    if (
        specification.branch.trim().length ===
        0
    ) {
        throw new TypeError(
            "Repair-loop branch cannot be empty."
        );
    }

    if (
        !Number.isInteger(
            specification.maximumRepairAttempts
        ) ||
        specification.maximumRepairAttempts <
            1
    ) {
        throw new TypeError(
            "Maximum repair attempts must be a positive integer."
        );
    }

    if (
        specification.maximumRepairAttempts >
        10
    ) {
        throw new TypeError(
            "Maximum repair attempts cannot exceed 10."
        );
    }

    if (
        specification.allowedPaths.length ===
        0
    ) {
        throw new TypeError(
            "Repair-loop specification must contain allowed paths."
        );
    }

    const normalizedAllowedPaths =
        specification.allowedPaths.map(
            normalizePath
        );

    if (
        new Set(
            normalizedAllowedPaths
        ).size !==
        normalizedAllowedPaths.length
    ) {
        throw new TypeError(
            "Repair-loop allowed paths must be unique."
        );
    }

    if (
        specification.requirements.pushAllowed
    ) {
        throw new TypeError(
            "Autonomous push is not allowed during repair."
        );
    }

    if (
        specification.requirements.commitAllowed
    ) {
        throw new TypeError(
            "Autonomous commit is not allowed during repair."
        );
    }

    if (
        specification.requirements.outsideRepositoryAllowed
    ) {
        throw new TypeError(
            "Outside-repository repair is not allowed."
        );
    }

}


export function validateRepairManifest(
    specification:
        RiverDevRepairLoopSpecification,
    manifest:
        RiverDevRepairManifest
): void {

    if (
        manifest.id.trim().length ===
        0
    ) {
        throw new TypeError(
            "Repair manifest identifier cannot be empty."
        );
    }

    if (
        manifest.failureCode.trim().length ===
        0
    ) {
        throw new TypeError(
            "Repair manifest failure code cannot be empty."
        );
    }

    if (
        manifest.paths.length ===
        0
    ) {
        throw new TypeError(
            "Repair manifest must contain at least one path."
        );
    }

    const unexpectedPaths =
        manifest.paths.filter(
            (path) => {
                return !isPathAllowed(
                    path,
                    specification.allowedPaths
                );
            }
        );

    if (
        unexpectedPaths.length >
        0
    ) {
        throw new TypeError(
            `Repair manifest contains unexpected paths: ${unexpectedPaths.join(", ")}`
        );
    }

}


export async function runAutonomousRepairLoop(
    dependencies:
        RiverDevRepairLoopDependencies,
    request:
        RiverDevRepairLoopRequest
): Promise<RiverDevRepairLoopResult> {

    validateRepairLoopSpecification(
        request.specification
    );

    const {
        specification
    } =
        request;

    const dryRun =
        request.dryRun ??
        specification
            .requirements
            .dryRunDefault;

    const branch =
        await dependencies
            .getCurrentBranch();

    if (
        branch !==
        specification.branch
    ) {
        throw new TypeError(
            `Repair-loop branch mismatch. Expected ${specification.branch}, received ${branch}.`
        );
    }

    const initialVerification =
        await dependencies.verify();

    if (
        initialVerification.passed
    ) {

        return {

            specificationId:
                specification.id,

            branch,

            outcome:
                "already-passing",

            passed:
                true,

            dryRun,

            attempts:
                [],

            finalVerification:
                initialVerification,

            warnings:
                []

        };

    }

    if (
        initialVerification.failureCode ===
        undefined ||
        initialVerification.failureCode
            .trim()
            .length ===
            0
    ) {

        return {

            specificationId:
                specification.id,

            branch,

            outcome:
                "unsupported-failure",

            passed:
                false,

            dryRun,

            attempts:
                [],

            finalVerification:
                initialVerification,

            warnings: [
                "Verification failed without a supported failure code."
            ]

        };

    }

    const attempts:
        RiverDevRepairAttempt[] =
        [];

    let currentVerification =
        initialVerification;

    for (
        let attempt = 1;
        attempt <=
            specification.maximumRepairAttempts;
        attempt += 1
    ) {

        const failureCode =
            currentVerification.failureCode;

        if (
            failureCode ===
            undefined
        ) {
            break;
        }

        const manifest =
            await dependencies
                .resolveManifest(
                    failureCode
                );

        if (
            manifest ===
            undefined
        ) {

            return {

                specificationId:
                    specification.id,

                branch,

                outcome:
                    "unsupported-failure",

                passed:
                    false,

                dryRun,

                attempts,

                finalVerification:
                    currentVerification,

                warnings: [
                    `No approved repair manifest exists for failure: ${failureCode}`
                ]

            };

        }

        validateRepairManifest(
            specification,
            manifest
        );

        await dependencies
            .applyManifest(
                manifest,
                dryRun
            );

        if (
            dryRun
        ) {

            attempts.push({

                attempt,

                failureCode,

                manifestId:
                    manifest.id,

                dryRun:
                    true,

                applied:
                    false,

                verificationPassed:
                    false,

                reviewPassed:
                    false,

                message:
                    "Repair manifest validated in dry-run mode."

            });

            return {

                specificationId:
                    specification.id,

                branch,

                outcome:
                    "blocked",

                passed:
                    false,

                dryRun:
                    true,

                attempts,

                finalVerification:
                    currentVerification,

                warnings: [
                    "Dry-run mode validated the repair but did not modify repository files."
                ]

            };

        }

        const reviewPassed =
            specification
                .requirements
                .reviewRequiredAfterRepair
                ? await dependencies.review(
                    manifest
                )
                : true;

        if (
            !reviewPassed
        ) {

            attempts.push({

                attempt,

                failureCode,

                manifestId:
                    manifest.id,

                dryRun:
                    false,

                applied:
                    true,

                verificationPassed:
                    false,

                reviewPassed:
                    false,

                message:
                    "Repair was blocked by review."

            });

            return {

                specificationId:
                    specification.id,

                branch,

                outcome:
                    "blocked",

                passed:
                    false,

                dryRun:
                    false,

                attempts,

                finalVerification:
                    currentVerification,

                warnings: [
                    "Post-repair review failed."
                ]

            };

        }

        currentVerification =
            await dependencies.verify();

        attempts.push({

            attempt,

            failureCode,

            manifestId:
                manifest.id,

            dryRun:
                false,

            applied:
                true,

            verificationPassed:
                currentVerification.passed,

            reviewPassed,

            message:
                currentVerification.passed
                    ? "Repair passed verification."
                    : "Repair did not resolve the verification failure."

        });

        if (
            currentVerification.passed
        ) {

            return {

                specificationId:
                    specification.id,

                branch,

                outcome:
                    "repaired",

                passed:
                    true,

                dryRun:
                    false,

                attempts,

                finalVerification:
                    currentVerification,

                warnings:
                    []

            };

        }

    }

    return {

        specificationId:
            specification.id,

        branch,

        outcome:
            "attempts-exhausted",

        passed:
            false,

        dryRun,

        attempts,

        finalVerification:
            currentVerification,

        warnings: [
            `Repair attempts exhausted after ${attempts.length} attempts.`
        ]

    };

}
