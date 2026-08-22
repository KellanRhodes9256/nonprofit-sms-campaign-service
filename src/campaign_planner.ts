import type { CampaignRequest } from "./campaign_schema.js";

export type PlannedMessage = {
  contactId: string;
  to: string;
  body: string;
  idempotencyKey: string;
};

export type CampaignPlan = {
  campaignId: string;
  skippedContactIds: string[];
  messages: PlannedMessage[];
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function planCampaign(input: CampaignRequest): CampaignPlan {
  const messages: PlannedMessage[] = [];
  const skippedContactIds: string[] = [];

  for (const item of input.messages) {
    if (!item.sms_opt_in) {
      skippedContactIds.push(item.contact_id);
      continue;
    }

    let body: string;
    if (item.kind === "donor_receipt") {
      body = `${input.organization_name}: Thanks ${item.donor_name}. We received ${dollars(item.amount_cents)}. Receipt ${item.receipt_number}.`;
    } else if (item.kind === "volunteer_reminder") {
      body = `${input.organization_name}: Hi ${item.volunteer_name}, your volunteer shift is ${item.shift_label} at ${item.location}.`;
    } else {
      body = `${input.organization_name}: Hi ${item.supporter_name}, ${item.campaign_name} has raised ${dollars(item.raised_cents)} so far.`;
    }

    messages.push({
      contactId: item.contact_id,
      to: item.phone,
      body,
      idempotencyKey: `${input.campaign_id}:${item.contact_id}:${item.kind}`,
    });
  }

  return { campaignId: input.campaign_id, skippedContactIds, messages };
}
