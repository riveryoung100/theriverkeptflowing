import {
    readSemanticModelCredentialFromStdin,
    runSemanticKnowledgeLiveCli
} from "../src/lib/orchestration/semantic-knowledge-live-cli";

import type {
    SemanticCandidateSet
} from "../src/lib/knowledge/semantic/types";


interface SemanticDiagnosticCapture {

    readonly candidates:
        SemanticCandidateSet;

    readonly rawContent:
        string;

}


let rawContent:
    string | undefined;

let diagnostic:
    SemanticDiagnosticCapture | undefined;


try {

    const result =
        await runSemanticKnowledgeLiveCli({
            arguments:
                process.argv.slice(
                    2
                ),
            readCredential:
                () =>
                    readSemanticModelCredentialFromStdin(),
            onRawContent:
                (
                    observedRawContent
                ) => {

                    rawContent =
                        observedRawContent;

                },
            onCandidates:
                (
                    candidates,
                    rawContent
                ) => {

                    diagnostic = {
                        candidates,
                        rawContent
                    };

                }
        });

    process.stdout.write(
        `${JSON.stringify(
            {
                result,
                rawContent:
                    rawContent ?? null,
                diagnostic:
                    diagnostic ?? null
            },
            null,
            2
        )}\n`
    );

}
catch (error) {

    process.stderr.write(
        `${JSON.stringify(
            {
                rawContent:
                    rawContent ?? null,
                diagnostic:
                    diagnostic ?? null
            },
            null,
            2
        )}\n`
    );

    throw error;

}