import {
    runLocalFileAssimilationCli
} from "../src/lib/assimilation/production/local-file-cli";


const result =
    await runLocalFileAssimilationCli(
        process.argv.slice(
            2
        )
    );


process.stdout.write(
    `${JSON.stringify(result, null, 2)}\n`
);
