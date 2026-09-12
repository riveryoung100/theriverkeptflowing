import {
    runTranscriptAssimilationCli
} from "../src/lib/assimilation/production/transcript-cli";


const result =
    await runTranscriptAssimilationCli(
        process.argv.slice(
            2
        )
    );


process.stdout.write(
    `${JSON.stringify(result, null, 2)}\n`
);
