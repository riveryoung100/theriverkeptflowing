import type {
    RiverDevExecutionAction,
    RiverDevExecutionDispatcher,
    RiverDevDispatchStep
} from "../types";

export function createExecutionDispatcher(
    action:
    RiverDevExecutionAction
):
    RiverDevExecutionDispatcher {

    const dispatches =
        action.actions.map(
            (step):
            RiverDevDispatchStep =>
            ({
                taskId:
                    step.taskId,

                state:
                    step.state === "blocked"
                    ? "blocked"
                    : step.state === "approval-required"
                    ? "approval-required"
                    : "dispatchable",

                reason:
                    step.reason

            })
        );

    const blockedReasons =
        dispatches
        .filter(
            (dispatch) =>
                dispatch.state === "blocked"
        )
        .map(
            (dispatch) =>
                dispatch.reason
        );

    return {

        version:
            "1.0.0",

        objective:
            action.objective,

        ready:
            action.ready &&
            dispatches.every(
                (dispatch) =>
                    dispatch.state === "dispatchable"
            ),

        dispatches,

        blockedReasons

    };

}
