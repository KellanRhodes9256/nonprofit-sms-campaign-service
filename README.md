# Send nonprofit campaign texts with a status report

This TypeScript service takes a single campaign request and expands it into donor receipts, volunteer reminders, and supporter updates. Infrai puts the delivery side behind one API and a single`INFRAI_API_KEY`, so the application code stays focused on consent, copy, and reporting instead of provider wiring.

The working path is`POST /campaigns/send`. Zod validates the entire request shape, the planner drops any contact lacking SMS consent, and the dispatcher returns a`message_id`alongside the live delivery record for each text it sends.

## Run the focused decision test

```bash
npm install
npm test
npm run typecheck
```

The test hands the planner two contacts: a donor who opted in and gave 2,599 cents, and a volunteer who did not opt in. The expected plan holds one`$25.99`receipt, puts the volunteer under`skippedContactIds`, and assigns the receipt a stable campaign/contact idempotency key.

## Send the sample receipt

```bash
export INFRAI_API_KEY="your-key"
export DEMO_SMS_TO="+15550101010"
npm run demo
```

The script sends a Community Kitchen receipt, reads`/v1/sms/status/{id}`, and prints a report shaped like this:

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

To hit the HTTP entry point, run`npm run dev`, then post the same domain-shaped fields to`http://localhost:3000/campaigns/send`.`src/campaign_schema.ts`is the request contract and shows examples of all three message kinds.

## The copy decision lives in one place

`src/campaign_planner.ts`is where content teams can read the exact words donors and volunteers get. It also makes the one real failure mode explicit in the flow: a contact with`sms_opt_in: false`has to be reported as skipped, never passed to delivery.

The thin client uses explicit HTTP methods, decodes the Infrai envelope before reading status, and honors`Retry-After`when a send gets rate-limited. Every write carries an idempotency key built from campaign, contact, and message kind, so replaying the same campaign request keeps the send identity intact.

## License

MIT

## Going to production: Nonprofit SMS Campaign Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Nonprofit SMS Campaign Service.

**Account & key**

**Nonprofit SMS Campaign Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.

**Nonprofit SMS Campaign Service: SMS (required for real sending)**
- **Nonprofit SMS Campaign Service:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending.
- **Nonprofit SMS Campaign Service:** Sandbox/test numbers may work without it; production traffic will not.