import {
    runYouTubeTranscriptLiveCli
} from "../src/lib/assimilation/ingestion/youtube-transcript-live-cli";


const result =
    await runYouTubeTranscriptLiveCli(
        {
            arguments:
                process.argv.slice(
                    2
                )
        }
    );


process.stdout.write(
    `${JSON.stringify(result, null, 2)}\n`
);
