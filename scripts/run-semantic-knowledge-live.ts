import {
    readSemanticModelCredentialFromStdin,
    runSemanticKnowledgeLiveCli
} from "../src/lib/orchestration/semantic-knowledge-live-cli";


const result =
    await runSemanticKnowledgeLiveCli(
        {
            arguments:
                process.argv.slice(
                    2
                ),

            readCredential:
                () =>
                    readSemanticModelCredentialFromStdin()
        }
    );


process.stdout.write(
    `${JSON.stringify(result, null, 2)}\n`
);
