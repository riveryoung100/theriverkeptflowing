import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeVerifiedTelnyxWebhookVoiceEvent
} from "./telnyx-verified-webhook-event";

const occurredAt =
    "2026-09-29T13:00:00.000Z";

function rawEvent(
    eventType: string,
    payload:
        Record<string, unknown> = {
            call_control_id:
                "call-control-1",
            call_leg_id:
                "call-leg-1",
            call_session_id:
                "call-session-1"
        }
): string {
    return JSON.stringify({
        id:
            "event-1",
        record_type:
            "event",
        event_type:
            eventType,
        occurred_at:
            occurredAt,
        payload
    });
}

test(
    "normalizes an already-verified supported Telnyx voice webhook",
    () => {
        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                rawEvent(
                    "call.answered"
                )
            ),
            {
                normalized: true,
                event: {
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
            }
        );
    }
);

test(
    "delegates all four supported lifecycle event types to the landed normalizer",
    () => {
        for(const type of [
            "call.initiated",
            "call.answered",
            "call.bridged",
            "call.hangup"
        ] as const){
            const result =
                normalizeVerifiedTelnyxWebhookVoiceEvent(
                    rawEvent(
                        type
                    )
                );

            assert.equal(
                result.normalized,
                true
            );

            if(result.normalized){
                assert.equal(
                    result.event.type,
                    type
                );
            }
        }
    }
);

test(
    "invalid JSON fails deterministically before provider normalization",
    () => {
        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                '{"data":'
            ),
            {
                normalized: false,
                reason:
                    "invalid-json"
            }
        );
    }
);

test(
    "empty raw body is invalid JSON",
    () => {
        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                ""
            ),
            {
                normalized: false,
                reason:
                    "invalid-json"
            }
        );
    }
);

test(
    "unsupported Telnyx event is ignored without canonical advancement",
    () => {
        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                rawEvent(
                    "call.playback.started"
                )
            ),
            {
                normalized: false,
                reason:
                    "unsupported-event"
            }
        );
    }
);

test(
    "recognized event missing provider identity is invalid payload",
    () => {
        const value:
            Record<string, unknown> = {
                record_type:
                    "event",
                event_type:
                    "call.answered",
                occurred_at:
                    occurredAt,
                payload: {
                    call_control_id:
                        "call-control-1"
                }
            };

        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                JSON.stringify(
                    value
                )
            ),
            {
                normalized: false,
                reason:
                    "invalid-payload"
            }
        );
    }
);

test(
    "recognized event with invalid record type is invalid payload",
    () => {
        const value = {
            id:
                "event-1",
            record_type:
                "call",
            event_type:
                "call.answered",
            occurred_at:
                occurredAt,
            payload: {
                call_control_id:
                    "call-control-1"
            }
        };

        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                JSON.stringify(
                    value
                )
            ),
            {
                normalized: false,
                reason:
                    "invalid-payload"
            }
        );
    }
);

test(
    "recognized event with invalid occurrence timestamp is invalid payload",
    () => {
        const value = {
            id:
                "event-1",
            record_type:
                "event",
            event_type:
                "call.answered",
            occurred_at:
                "not-a-timestamp",
            payload: {
                call_control_id:
                    "call-control-1"
            }
        };

        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                JSON.stringify(
                    value
                )
            ),
            {
                normalized: false,
                reason:
                    "invalid-payload"
            }
        );
    }
);

test(
    "recognized event without call-control identity is invalid payload",
    () => {
        const value = {
            id:
                "event-1",
            record_type:
                "event",
            event_type:
                "call.answered",
            occurred_at:
                occurredAt,
            payload: {
                call_leg_id:
                    "call-leg-1"
            }
        };

        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                JSON.stringify(
                    value
                )
            ),
            {
                normalized: false,
                reason:
                    "invalid-payload"
            }
        );
    }
);

test(
    "non-object JSON is invalid payload rather than unsupported event",
    () => {
        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                "null"
            ),
            {
                normalized: false,
                reason:
                    "invalid-payload"
            }
        );

        assert.deepEqual(
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                '"text"'
            ),
            {
                normalized: false,
                reason:
                    "invalid-payload"
            }
        );
    }
);

test(
    "hangup normalization retains only canonical evidence and discards raw provider fields",
    () => {
        const result =
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                rawEvent(
                    "call.hangup",
                    {
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
                    }
                )
            );

        assert.equal(
            result.normalized,
            true
        );

        if(!result.normalized){
            return;
        }

        assert.deepEqual(
            result.event,
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

        const serialized =
            JSON.stringify(
                result.event
            );

        assert.equal(
            serialized.includes(
                "+15550000001"
            ),
            false
        );

        assert.equal(
            serialized.includes(
                "arbitrary_provider_field"
            ),
            false
        );
    }
);

test(
    "provider event and call-control correlation identities are preserved exactly",
    () => {
        const value = {
            id:
                "evt_exact_identity_123",
            record_type:
                "event",
            event_type:
                "call.bridged",
            occurred_at:
                occurredAt,
            payload: {
                call_control_id:
                    "v3:call-control/exact_456"
            }
        };

        const result =
            normalizeVerifiedTelnyxWebhookVoiceEvent(
                JSON.stringify(
                    value
                )
            );

        assert.equal(
            result.normalized,
            true
        );

        if(result.normalized){
            assert.equal(
                result.event.providerEventId,
                "evt_exact_identity_123"
            );

            assert.equal(
                result.event.callControlId,
                "v3:call-control/exact_456"
            );
        }
    }
);
