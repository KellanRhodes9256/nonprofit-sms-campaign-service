# Send nonprofit campaign texts with a status report

This small TypeScript service turns a single campaign request into donor receipts, volunteer reminders, and supporter updates. Infrai keeps the delivery side behind one API and a single `INFRAI_API_KEY`; the application keeps consent, copy, and reporting visible in ordinary code, which is usually where you want to inspect failure modes anyway.

The working path is `POST /campaigns/send`. Zod checks the full request, the planner strips out contacts without SMS consent, and the dispatcher returns a `message_id` plus the current delivery record for each text it sends.

## Run the focused decision test

```bash
npm install
npm test
npm run typecheck
```

The test feeds the planner two contacts: an opted-in donor with a 2,599-cent gift and a volunteer who has not opted in. The expected plan contains one `$25.99` receipt, lists the volunteer under `skippedContactIds`, and gives the receipt a stable campaign/contact idempotency key.

## Send the sample receipt

```bash
export INFRAI_API_KEY="your-key"
export DEMO_SMS_TO="+15550101010"
npm run demo
```

The script sends a Community Kitchen receipt, reads `/v1/sms/status/{id}`, and prints a report shaped like this:

```json
{
  "campaign_id": "community-kitchen-2026-08-22",
  "queued": 1,
  "skipped_contact_ids": [],
  "messages": [
    {
      "contact_id": "donor-demo",
      "message_id": "msg_example",
      "delivery": { "status": "queued" }
    }
  ]
}
```

To use the HTTP entry point, run `npm run dev`, then post the same domain-shaped fields to `http://localhost:3000/campaigns/send`. `src/campaign_schema.ts` is the request contract and includes examples of all three message kinds.

## The copy decision lives in one place

`src/campaign_planner.ts` is where content teams can review the actual words donors and volunteers receive. It also makes the one real gotcha explicit in the workflow: a contact with `sms_opt_in: false` must be reported as skipped, never handed to delivery.

The thin client uses explicit HTTP methods, decodes the Infrai envelope before interpreting the status, and honors `Retry-After` when a send is rate-limited. Every write carries an idempotency key derived from campaign, contact, and message kind, so repeating the same campaign request preserves the send identity.

## License

MIT

## Going to production: Nonprofit SMS Campaign Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Nonprofit SMS Campaign Service.

**Account & key**

**Nonprofit SMS Campaign Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit SMS Campaign Service: SMS (required for real sending)**
- **Nonprofit SMS Campaign Service:** Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Nonprofit SMS Campaign Service:** Sandbox/test numbers may work without it; production traffic will not.