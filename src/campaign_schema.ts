import { z } from "zod";

const contact = z.object({
  contact_id: z.string().min(1),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  sms_opt_in: z.boolean(),
});

const donorReceipt = contact.extend({
  kind: z.literal("donor_receipt"),
  donor_name: z.string().min(1),
  amount_cents: z.number().int().positive(),
  receipt_number: z.string().min(1),
});

const volunteerReminder = contact.extend({
  kind: z.literal("volunteer_reminder"),
  volunteer_name: z.string().min(1),
  shift_label: z.string().min(1),
  location: z.string().min(1),
});

const campaignReport = contact.extend({
  kind: z.literal("campaign_report"),
  supporter_name: z.string().min(1),
  campaign_name: z.string().min(1),
  raised_cents: z.number().int().nonnegative(),
});

export const campaignRequestSchema = z.object({
  campaign_id: z.string().min(1),
  organization_name: z.string().min(1),
  messages: z.array(z.discriminatedUnion("kind", [donorReceipt, volunteerReminder, campaignReport])).min(1).max(100),
});

export type CampaignRequest = z.infer<typeof campaignRequestSchema>;
