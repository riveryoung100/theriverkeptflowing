import {
    readYouTubeApiCredentialFromStdin,
    runYouTubeContentSourceLiveCli
} from "../src/lib/assimilation/ingestion/youtube-content-source-live-cli";


const result =
    await runYouTubeContentSourceLiveCli(
        {
            arguments:
                process.argv.slice(
                    2
                ),

            readCredential:
                () =>
                    readYouTubeApiCredentialFromStdin()
        }
    );


process.stdout.write(
    `${JSON.stringify(result, null, 2)}\n`
);
