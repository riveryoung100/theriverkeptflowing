import type {
    RiverDevExecutionRunner,
    RiverDevExecutionSimulation,
    RiverDevRunnerStep
} from "../types";

export function createExecutionRunner(
    simulation:
    RiverDevExecutionSimulation
):
RiverDevExecutionRunner {

    const steps =
        simulation.steps.map(
            (step):
            RiverDevRunnerStep =>
            ({
                taskId:
                    step.taskId,

                state:
                    step.state === "blocked"
                    ? "blocked"
                    : step.state === "approval-required"
                    ? "approval-required"
                    : "executable",

                reason:
                    step.reason

            })
        );

    const blockedReasons =
        steps
        .filter(
            (step) =>
                step.state === "blocked"
        )
        .map(
            (step) =>
                step.reason
        );

    return {

        version:
            "1.0.0",

        objective:
            simulation.objective,

        ready:
            simulation.ready &&
            steps.every(
                (step) =>
                    step.state === "executable"
            ),

        steps,

        blockedReasons

    };

}
