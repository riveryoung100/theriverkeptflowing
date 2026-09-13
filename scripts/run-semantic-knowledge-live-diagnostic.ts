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
                diagnostic:
                    diagnostic ?? null
            },
            null,
            2
        )}\n`
    );

    throw error;

}