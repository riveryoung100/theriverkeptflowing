import type {
RiverDevExecutionManifest,
RiverDevExecutionTask,
RiverDevImplementationPlan
} from "../types";


function createTask(
path:
string,
action:
"inspect" |
"modify" |
"create",
priority:
number,
reason:
string,
index:
number
):
RiverDevExecutionTask {

    return {

        id:
            `task-${index + 1}`,

        path,

        action,

        priority,

        reason

    };

}


export function createExecutionManifest(
plan:
RiverDevImplementationPlan
):
RiverDevExecutionManifest {


    const tasks =
        plan.decisions
            .map(
                (decision, index) =>
                    createTask(
                        decision.path,
                        decision.action,
                        decision.priority,
                        decision.reason,
                        index
                    )
            )
            .sort(
                (a, b) =>
                    b.priority - a.priority
            );


    const approvalRequired =
        tasks
            .filter(
                (task) =>
                    task.action === "modify" ||
                    task.action === "create"
            )
            .map(
                (task) =>
                    task.path
            );


    return {

        version:
            "1.0.0",

        objective:
            plan.objective,

        tasks,

        approvalRequired

    };

}
