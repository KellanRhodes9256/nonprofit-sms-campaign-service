import assert from "node:assert/strict";
import test from "node:test";
import { planCampaign } from "../src/campaign_planner.js";
import { campaignRequestSchema } from "../src/campaign_schema.js";

test("plans opted-in receipts and skips contacts without SMS consent", () => {
  const input = campaignRequestSchema.parse({
    campaign_id: "spring-meals",
    organization_name: "Neighborhood Table",
    messages: [
      {
        kind: "donor_receipt",
        contact_id: "donor-17",
        phone: "+15550101010",
        sms_opt_in: true,
        donor_name: "Avery",
        amount_cents: 2599,
        receipt_number: "NT-17",
      },
      {
        kind: "volunteer_reminder",
        contact_id: "volunteer-8",
        phone: "+15550101011",
        sms_opt_in: false,
        volunteer_name: "Sam",
        shift_label: "Saturday at 9:00 AM",
        location: "West pantry",
      },
    ],
  });

  const plan = planCampaign(input);

  assert.equal(plan.messages.length, 1);
  assert.deepEqual(plan.skippedContactIds, ["volunteer-8"]);
  assert.match(plan.messages[0].body, /\$25\.99/);
  assert.equal(plan.messages[0].idempotencyKey, "spring-meals:donor-17:donor_receipt");
});
