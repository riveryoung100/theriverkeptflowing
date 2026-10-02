import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function source(
    relative:
        string
):
    Promise<string> {

    return await readFile(
        new URL(
            relative,
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "INS-007R carries canonical CRM queue and search from page through every private insurance form",
    async () => {
        const page =
            await source(
                "../../pages/river-os/crm.astro"
            );

        const list =
            await source(
                "../../components/river-os/CrmRelationshipList.astro"
            );

        assert.match(
            page,
            /insuranceQueue=\{selectedInsuranceQueue\}/
        );

        assert.match(
            page,
            /search=\{requestedSearch\}/
        );

        for(const component of [
            "InsuranceOperatingStateForm",
            "InsuranceAppointmentForm",
            "InsuranceFollowUpForm"
        ]){
            assert.match(
                list,
                new RegExp(
                    `<${component}[\\s\\S]*insuranceQueue=\\{insuranceQueue\\}[\\s\\S]*search=\\{search\\}[\\s\\S]*\\/>`
                )
            );
        }
    }
);


test(
    "INS-007R private insurance forms submit only whitelisted CRM view context",
    async () => {
        const operating =
            await source(
                "../../components/river-os/InsuranceOperatingStateForm.astro"
            );

        const appointment =
            await source(
                "../../components/river-os/InsuranceAppointmentForm.astro"
            );

        const followUp =
            await source(
                "../../components/river-os/InsuranceFollowUpForm.astro"
            );

        assert.equal(
            (operating.match(/name="insuranceQueue"/g) ?? []).length,
            1
        );

        assert.equal(
            (operating.match(/name="search"/g) ?? []).length,
            1
        );

        assert.equal(
            (appointment.match(/name="insuranceQueue"/g) ?? []).length,
            2
        );

        assert.equal(
            (appointment.match(/name="search"/g) ?? []).length,
            2
        );

        assert.equal(
            (followUp.match(/name="insuranceQueue"/g) ?? []).length,
            2
        );

        assert.equal(
            (followUp.match(/name="search"/g) ?? []).length,
            2
        );

        for(const form of [
            operating,
            appointment,
            followUp
        ]){
            assert.doesNotMatch(
                form,
                /name="return(To|Url)"/
            );
        }
    }
);
