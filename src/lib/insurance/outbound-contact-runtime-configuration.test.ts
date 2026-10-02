import assert from "node:assert/strict";
import test from "node:test";

import {
    resolveInsuranceOutboundContactRuntimeConfiguration
} from "./outbound-contact-runtime-configuration";

test(
    "INS-007U fails closed when outbound contact is disabled or missing",
    () => {
        assert.equal(
            resolveInsuranceOutboundContactRuntimeConfiguration({}),
            undefined
        );

        assert.equal(
            resolveInsuranceOutboundContactRuntimeConfiguration({
                INSURANCE_OUTBOUND_CONTACT_ENABLED: "false",
                INSURANCE_CONTACT_PROVIDER: "telnyx",
                TELNYX_API_KEY: "key",
                TELNYX_CONNECTION_ID: "connection",
                TELNYX_FROM_NUMBER: "+15555550100"
            }),
            undefined
        );
    }
);

test(
    "INS-007U fails closed for unsupported or missing provider selection",
    () => {
        assert.equal(
            resolveInsuranceOutboundContactRuntimeConfiguration({
                INSURANCE_OUTBOUND_CONTACT_ENABLED: "true"
            }),
            undefined
        );

        assert.equal(
            resolveInsuranceOutboundContactRuntimeConfiguration({
                INSURANCE_OUTBOUND_CONTACT_ENABLED: "true",
                INSURANCE_CONTACT_PROVIDER: "other",
                TELNYX_API_KEY: "key",
                TELNYX_CONNECTION_ID: "connection",
                TELNYX_FROM_NUMBER: "+15555550100"
            }),
            undefined
        );
    }
);

test(
    "INS-007U fails closed when Telnyx configuration is partial",
    () => {
        assert.equal(
            resolveInsuranceOutboundContactRuntimeConfiguration({
                INSURANCE_OUTBOUND_CONTACT_ENABLED: "true",
                INSURANCE_CONTACT_PROVIDER: "telnyx",
                TELNYX_API_KEY: "key",
                TELNYX_CONNECTION_ID: "connection"
            }),
            undefined
        );

        assert.equal(
            resolveInsuranceOutboundContactRuntimeConfiguration({
                INSURANCE_OUTBOUND_CONTACT_ENABLED: "true",
                INSURANCE_CONTACT_PROVIDER: "telnyx",
                TELNYX_API_KEY: "   ",
                TELNYX_CONNECTION_ID: "connection",
                TELNYX_FROM_NUMBER: "+15555550100"
            }),
            undefined
        );
    }
);

test(
    "INS-007U resolves complete server-owned Telnyx configuration without constructing a provider",
    () => {
        assert.deepEqual(
            resolveInsuranceOutboundContactRuntimeConfiguration({
                INSURANCE_OUTBOUND_CONTACT_ENABLED: "true",
                INSURANCE_CONTACT_PROVIDER: " TELNYX ",
                TELNYX_API_KEY: " key ",
                TELNYX_CONNECTION_ID: " connection ",
                TELNYX_FROM_NUMBER: " +15555550100 "
            }),
            {
                provider: "telnyx",
                apiKey: "key",
                connectionId: "connection",
                fromNumber: "+15555550100"
            }
        );
    }
);
