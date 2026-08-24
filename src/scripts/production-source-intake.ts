import {
    runProductionSourceCommand
} from "../lib/productionSourceCommand";


try {

    await runProductionSourceCommand(
        process.argv.slice(
            2
        )
    );

}
catch (error) {

    console.error(
        error
    );

    process.exitCode =
        1;

}