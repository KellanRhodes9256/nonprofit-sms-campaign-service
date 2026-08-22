import { planCampaign } from "./campaign_planner.js";
import type { CampaignRequest } from "./campaign_schema.js";
import { infrai, type SmsGateway } from "./infrai_sms.js";

export type MessageResult = {
  contact_id: string;
  message_id: string;
  delivery: Record<string, unknown>;
};

export async function dispatchCampaign(input: CampaignRequest, client: SmsGateway) {
  const plan = planCampaign(input);
  const results: MessageResult[] = [];

  for (const item of plan.messages) {
    const sent = await infrai.sms.send(client, {
      to: item.to,
      body: item.body,
      idempotency_key: item.idempotencyKey,
    });
    const delivery = await infrai.sms.status(client, sent.message_id);
    results.push({ contact_id: item.contactId, message_id: sent.message_id, delivery });
  }

  return {
    campaign_id: plan.campaignId,
    queued: results.length,
    skipped_contact_ids: plan.skippedContactIds,
    messages: results,
  };
}
