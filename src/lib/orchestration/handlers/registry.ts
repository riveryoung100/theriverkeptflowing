import type {
    WorkflowStepType
} from "../types";

import type {
    WorkflowStepHandler,
    WorkflowStepHandlerRegistry
} from "./types";


export class DeterministicWorkflowStepHandlerRegistry
implements WorkflowStepHandlerRegistry {

    private readonly handlers =
        new Map<
            WorkflowStepType,
            WorkflowStepHandler
        >();


    register(
        handler: WorkflowStepHandler
    ): void {

        if (
            this.handlers.has(
                handler.type
            )
        ) {

            throw new TypeError(
                `A workflow step handler is already registered for ${handler.type}.`
            );

        }

        this.handlers.set(
            handler.type,
            handler
        );

    }


    has(
        type: WorkflowStepType
    ): boolean {

        return this.handlers.has(
            type
        );

    }


    get(
        type: WorkflowStepType
    ): WorkflowStepHandler {

        const handler =
            this.handlers.get(
                type
            );

        if (
            handler ===
            undefined
        ) {

            throw new TypeError(
                `No workflow step handler is registered for ${type}.`
            );

        }

        return handler;

    }


    list():
    readonly WorkflowStepType[] {

        return [
            ...this.handlers.keys()
        ].sort();

    }

}


export function createWorkflowStepHandlerRegistry():
WorkflowStepHandlerRegistry {

    return new
        DeterministicWorkflowStepHandlerRegistry();

}
