import assert from "node:assert/strict";
import test from "node:test";

import {
    buildInsurancePrivateAppointmentRequestFromForm
} from "./private-appointment-request";


function form(
    entries:
        Record<
            string,
            string
        >
):
    FormData {

    const formData =
        new FormData();

    for(
        const [
            key,
            value
        ] of Object.entries(
            entries
        )
    ){
        formData.set(
            key,
            value
        );
    }

    return formData;
}


test(
    "private appointment request parses explicit schedule operation with absolute timestamp",
    () => {
        const request =
            buildInsurancePrivateAppointmentRequestFromForm(
                form({
                    relationshipId:
                        "relationship:appointment-route-1",

                    operation:
                        "schedule",

                    appointmentAt:
                        "2026-10-02T09:30:00-05:00"
                })
            );

        assert.deepEqual(
            request,
            {
                relationshipId:
                    "relationship:appointment-route-1",

                operation:
                    "schedule",

                appointmentAt:
                    "2026-10-02T09:30:00-05:00"
            }
        );
    }
);


test(
    "private appointment request trims normalized transport text",
    () => {
        const request =
            buildInsurancePrivateAppointmentRequestFromForm(
                form({
                    relationshipId:
                        " relationship:appointment-route-1 ",

                    operation:
                        " schedule ",

                    appointmentAt:
                        " 2026-10-02T14:30:00Z "
                })
            );

        assert.equal(
            request.relationshipId,
            "relationship:appointment-route-1"
        );

        assert.equal(
            request.operation,
            "schedule"
        );

        assert.equal(
            request.appointmentAt,
            "2026-10-02T14:30:00Z"
        );
    }
);


test(
    "private appointment clear operation maps explicitly to null even if a stale form timestamp is present",
    () => {
        const request =
            buildInsurancePrivateAppointmentRequestFromForm(
                form({
                    relationshipId:
                        "relationship:appointment-route-1",

                    operation:
                        "clear",

                    appointmentAt:
                        "2026-10-02T14:30:00Z"
                })
            );

        assert.deepEqual(
            request,
            {
                relationshipId:
                    "relationship:appointment-route-1",

                operation:
                    "clear",

                appointmentAt:
                    null
            }
        );
    }
);


test(
    "private appointment request rejects unsupported operation",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateAppointmentRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:appointment-route-1",

                        operation:
                            "snooze"
                    })
                ),
            /operation is not supported/
        );
    }
);


test(
    "private appointment schedule requires appointmentAt",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateAppointmentRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:appointment-route-1",

                        operation:
                            "schedule"
                    })
                ),
            /requires appointmentAt/
        );
    }
);


test(
    "private appointment schedule rejects timezone-ambiguous local timestamp",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateAppointmentRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:appointment-route-1",

                        operation:
                            "schedule",

                        appointmentAt:
                            "2026-10-02T09:30:00"
                    })
                ),
            /absolute timestamp/
        );
    }
);


test(
    "private appointment schedule rejects invalid absolute timestamp",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateAppointmentRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:appointment-route-1",

                        operation:
                            "schedule",

                        appointmentAt:
                            "not-a-dateZ"
                    })
                ),
            /absolute timestamp/
        );
    }
);


test(
    "private appointment request reuses canonical River CRM relationship identity validation",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateAppointmentRequestFromForm(
                    form({
                        relationshipId:
                            "appointment-route-1",

                        operation:
                            "clear"
                    })
                ),
            /relationship identity/
        );
    }
);
