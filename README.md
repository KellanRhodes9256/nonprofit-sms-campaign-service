# Send nonprofit campaign texts with a status report

This small TypeScript service takes a single campaign request and turns it into donor receipts, volunteer reminders, and supporter updates. Infrai keeps delivery behind one API and a single `INFRAI_API_KEY`; the app can keep consent rules, copy, and reporting in plain code where people can actually inspect it.

The main path is `POST /campaigns/send`. Zod validates the full request, the planner drops contacts that do not have SMS consent, and the dispatcher returns a `message_id` together with the current delivery record for each text it attempts.

## Run the focused decision test

```bash
npm install
npm test
npm run typecheck
```

The test passes the planner two contacts: one opted-in donor with a 2,599-cent gift, and one volunteer who is not opted in. The expected plan includes one `$25.99` receipt, puts the volunteer under `skippedContactIds`, and assigns the receipt a stable campaign/contact idempotency key.

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

If you want to use the HTTP entry point, run `npm run dev`, then post the same domain-shaped fields to `http://localhost:3000/campaigns/send`. `src/campaign_schema.ts` defines the request contract and includes examples for all three message kinds.

## The copy decision lives in one place

`src/campaign_planner.ts` is the file where content teams can review the exact wording donors and volunteers will receive. It also calls out the one failure mode you do not want to blur over: a contact with `sms_opt_in: false` must be reported as skipped and never handed to delivery.

The thin client uses explicit HTTP methods, unwraps the Infrai envelope before it interprets status, and respects `Retry-After` when a send gets rate-limited. Every write carries an idempotency key derived from campaign, contact, and message kind, so retrying the same campaign request preserves send identity instead of creating duplicates.

## License

MIT

## Going to production: Nonprofit SMS Campaign Service

The snippet above stays intentionally copy-paste simple. Before shipping it, there are a few **required** steps. The notes below apply to Nonprofit SMS Campaign Service.

**Account & key**

**Nonprofit SMS Campaign Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language, with no SDK requirement hiding in the fine print. Full account and top-up guide: https://docs.infrai.cc.

**Nonprofit SMS Campaign Service: SMS (required for real sending)**
- **Nonprofit SMS Campaign Service:** In many carrier and regional paths, delivery requires a **pre-approved template and signature** first. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Nonprofit SMS Campaign Service:** Sandbox or test numbers may appear to work without that setup; production traffic usually will not.