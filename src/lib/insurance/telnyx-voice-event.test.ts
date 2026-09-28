import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeTelnyxVoiceEvent
} from "./telnyx-voice-event";


const occurredAt =
    "2026-09-28T20:00:00.000Z";


function envelope(
    eventType:
        string
):
    Record<string, unknown> {

    return {
        id:
            "event-1",
        record_type:
            "event",
        event_type:
            eventType,
        occurred_at:
            occurredAt,
        payload: {
            call_control_id:
                "call-control-1",
            call_leg_id:
                "call-leg-1",
            call_session_id:
                "call-session-1"
        }
    };
}


test(
    "normalizes Telnyx call answered lifecycle evidence",
    () => {
        assert.deepEqual(
            normalizeTelnyxVoiceEvent(
                envelope(
                    "call.answered"
                )
            ),
            {
                provider:
                    "telnyx",
                providerEventId:
                    "event-1",
                type:
                    "call.answered",
                occurredAt,
                callControlId:
                    "call-control-1",
                callLegId:
                    "call-leg-1",
                callSessionId:
                    "call-session-1"
            }
        );
    }
);


test(
    "normalizes initiated and bridged lifecycle events",
    () => {
        assert.equal(
            normalizeTelnyxVoiceEvent(
                envelope(
                    "call.initiated"
                )
            )?.type,
            "call.initiated"
        );

        assert.equal(
            normalizeTelnyxVoiceEvent(
                envelope(
                    "call.bridged"
                )
            )?.type,
            "call.bridged"
        );
    }
);


test(
    "normalizes hangup evidence without retaining raw payload",
    () => {
        const value =
            envelope(
                "call.hangup"
            );

        value.payload = {
            call_control_id:
                "call-control-2",
            call_leg_id:
                "call-leg-2",
            call_session_id:
                "call-session-2",
            hangup_cause:
                "normal_clearing",
            hangup_source:
                "caller",
            sip_hangup_cause:
                "200",
            from:
                "+15550000001",
            to:
                "+15550000002",
            arbitrary_provider_field:
                "must-not-survive"
        };

        const normalized =
            normalizeTelnyxVoiceEvent(
                value
            );

        assert.deepEqual(
            normalized,
            {
                provider:
                    "telnyx",
                providerEventId:
                    "event-1",
                type:
                    "call.hangup",
                occurredAt,
                callControlId:
                    "call-control-2",
                callLegId:
                    "call-leg-2",
                callSessionId:
                    "call-session-2",
                hangupCause:
                    "normal_clearing",
                hangupSource:
                    "caller",
                sipHangupCause:
                    "200"
            }
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                normalized ?? {},
                "payload"
            ),
            false
        );

        assert.equal(
            JSON.stringify(
                normalized
            ).includes(
                "+15550000001"
            ),
            false
        );
    }
);


test(
    "unknown Telnyx event types are ignored without canonical advancement",
    () => {
        assert.equal(
            normalizeTelnyxVoiceEvent(
                envelope(
                    "call.playback.started"
                )
            ),
            undefined
        );
    }
);


test(
    "recognized event requires provider event identity",
    () => {
        const value =
            envelope(
                "call.answered"
            );

        delete value.id;

        assert.throws(
            () =>
                normalizeTelnyxVoiceEvent(
                    value
                ),
            /requires id/
        );
    }
);


test(
    "recognized event requires event record type",
    () => {
        const value =
            envelope(
                "call.answered"
            );

        value.record_type =
            "call";

        assert.throws(
            () =>
                normalizeTelnyxVoiceEvent(
                    value
                ),
            /record_type to equal event/
        );
    }
);


test(
    "recognized event requires valid occurred timestamp",
    () => {
        const value =
            envelope(
                "call.answered"
            );

        value.occurred_at =
            "not-a-timestamp";

        assert.throws(
            () =>
                normalizeTelnyxVoiceEvent(
                    value
                ),
            /valid timestamp/
        );
    }
);


test(
    "recognized event requires call control identity",
    () => {
        const value =
            envelope(
                "call.answered"
            );

        value.payload = {
            call_leg_id:
                "call-leg-1"
        };

        assert.throws(
            () =>
                normalizeTelnyxVoiceEvent(
                    value
                ),
            /payload\.call_control_id/
        );
    }
);


test(
    "optional call identities are omitted when absent",
    () => {
        const value =
            envelope(
                "call.initiated"
            );

        value.payload = {
            call_control_id:
                "call-control-only"
        };

        assert.deepEqual(
            normalizeTelnyxVoiceEvent(
                value
            ),
            {
                provider:
                    "telnyx",
                providerEventId:
                    "event-1",
                type:
                    "call.initiated",
                occurredAt,
                callControlId:
                    "call-control-only"
            }
        );
    }
);


test(
    "non-object recognized envelope input is rejected",
    () => {
        assert.throws(
            () =>
                normalizeTelnyxVoiceEvent(
                    null
                ),
            /envelope to be an object/
        );
    }
);
