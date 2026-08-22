import { dispatchCampaign } from "../src/campaign_dispatcher.js";
import { campaignRequestSchema } from "../src/campaign_schema.js";
import { infraiSmsFromEnv } from "../src/infrai_sms.js";

const phone = process.env.DEMO_SMS_TO;
if (!phone) throw new Error("DEMO_SMS_TO is required");

const campaign = campaignRequestSchema.parse({
  campaign_id: `community-kitchen-${new Date().toISOString().slice(0, 10)}`,
  organization_name: "Community Kitchen",
  messages: [{
    kind: "donor_receipt",
    contact_id: "donor-demo",
    phone,
    sms_opt_in: true,
    donor_name: "Riley",
    amount_cents: 4500,
    receipt_number: "CK-1042",
  }],
});

console.log(JSON.stringify(await dispatchCampaign(campaign, infraiSmsFromEnv()), null, 2));
