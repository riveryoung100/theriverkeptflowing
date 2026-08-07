import type {
RiverDevExecutionManifest,
RiverDevValidationResult,
RiverDevValidationDecision
} from "../types";


function validateTask(
task:
{
id:
string;

path:
string;

action:
"inspect" |
"modify" |
"create";

priority:
number;

reason:
string;
}
):
RiverDevValidationDecision {

const protectedPath =
task.path.includes(".env") ||
task.path.includes(".git") ||
task.path.includes("node_modules") ||
task.path.includes("dist");


return {

taskId:
task.id,

path:
task.path,

valid:
!protectedPath,

reason:
protectedPath
? "blocked protected repository path"
: "approved execution scope",

requiresApproval:
task.action === "modify" ||
task.action === "create"

};

}


export function validateExecutionManifest(
manifest:
RiverDevExecutionManifest
):
RiverDevValidationResult {

const decisions =
manifest.tasks
.map(
(task) =>
validateTask(task)
);


const blockedReasons =
decisions
.filter(
(decision) =>
!decision.valid
)
.map(
(decision) =>
decision.reason
);


return {

version:
"1.0.0",

ready:
blockedReasons.length === 0,

decisions,

blockedReasons

};

}
