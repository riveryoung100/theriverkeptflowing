import {
    INSURANCE_LEAD_TRIAGE_FILTERS
} from "./lead-triage";

import type {
    InsuranceLeadTriageFilter
} from "./lead-triage";


export interface InsurancePrivateCrmViewContext {
    readonly insuranceQueue?:
        InsuranceLeadTriageFilter;

    readonly search?:
        string;
}


export type InsurancePrivateActionFeedbackKey =
    | "operatingState"
    | "appointment"
    | "followUp";


function optionalFormText(
    formData:
        FormData,
    field:
        string
):
    string | undefined {

    const value =
        formData.get(
            field
        );

    return typeof value === "string"
        ? value
        : undefined;
}


export function buildInsurancePrivateCrmViewContextFromForm(
    formData:
        FormData
):
    InsurancePrivateCrmViewContext {

    const rawInsuranceQueue =
        optionalFormText(
            formData,
            "insuranceQueue"
        )
            ?.trim();

    const insuranceQueue =
        rawInsuranceQueue !== undefined &&
        rawInsuranceQueue !== "" &&
        rawInsuranceQueue !== "all" &&
        (
            INSURANCE_LEAD_TRIAGE_FILTERS as readonly string[]
        ).includes(
            rawInsuranceQueue
        )
            ? rawInsuranceQueue as
                InsuranceLeadTriageFilter
            : undefined;

    const search =
        optionalFormText(
            formData,
            "search"
        )
            ?.trim()
            .slice(
                0,
                200
            );

    return {
        ...(
            insuranceQueue === undefined
                ? {}
                : {
                    insuranceQueue
                }
        ),

        ...(
            search === undefined ||
            search === ""
                ? {}
                : {
                    search
                }
        )
    };
}


export function buildInsurancePrivateCrmActionRedirect(
    feedbackKey:
        InsurancePrivateActionFeedbackKey,
    feedbackValue:
        string,
    context:
        InsurancePrivateCrmViewContext
):
    string {

    const params =
        new URLSearchParams();

    if (
        context.insuranceQueue !==
        undefined
    ) {
        params.set(
            "insuranceQueue",
            context.insuranceQueue
        );
    }

    if (
        context.search !==
        undefined
    ) {
        params.set(
            "search",
            context.search
        );
    }

    params.set(
        feedbackKey,
        feedbackValue
    );

    return `/river-os/crm?${params.toString()}`;
}
