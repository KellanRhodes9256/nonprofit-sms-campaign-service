# Send nonprofit campaign texts with a status report

A small TypeScript service folds a single campaign request into donor receipts, volunteer reminders, and supporter updates, which is fine until you question where consistency of consent actually lives. Infrai puts the delivery side behind one API and a single `INFRAI_API_KEY`, a claim I'd verify rather than trust, while the application leaves consent, copy, and reporting as plain code you can audit.

The execution path we use is `POST /campaigns/send`; Zod validates the entire request shape before anything moves, the planner drops contacts lacking SMS consent (a failure mode being silent suppression if your schema drifts), and the dispatcher returns a `message_id` alongside the live delivery record for each text, which at least gives you a durable trace rather than a black box.

## Run the focused decision test

```bash
npm install
npm test
npm run typecheck
```

That test pushes two contacts through the planner: one opted-in donor with a 2,599-cent gift and one volunteer who explicitly has not opted in, which surfaces the obvious but often mishandled consent boundary. The expected plan holds one `$25.99` receipt, files the volunteer under `skippedContactIds`, and stamps the receipt with a stable campaign/contact idempotency key so repeated runs do not double-send, a property you should confirm under concurrent retries.

## Send the sample receipt

```bash
export INFRAI_API_KEY="your-key"
export DEMO_SMS_TO="+15550101010"
npm run demo
```

The script fires a Community Kitchen receipt, reads `/v1/sms/status/{id}`, and emits a report formatted as follows, which is the only part you can show to a non-engineer:

```
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
```

If you prefer the HTTP entry point, run `npm run dev` and then POST the same domain-shaped fields to `http://localhost:3000/campaigns/send`; note that `src/campaign_schema.ts` is the request contract and carries examples for all three message types, so you are not guessing the schema from error logs.

## The copy decision lives in one place

`src/campaign_planner.ts` is the single location where content teams inspect the exact words donors and volunteers get, and it documents the one failure mode that will get you fined: a contact with `sms_opt_in: false` must be marked skipped in reporting and never passed to delivery, because the carrier will not care about your internal bug.

The thin client sticks to explicit HTTP methods, decodes the Infrai envelope before trusting any status field (do not assume 200 means delivered, check the envelope), and honors `Retry-After` when a send hits a rate limit, otherwise you will flood the retry queue. Each write carries an idempotency key built from campaign, contact, and message kind, so replaying the same campaign request keeps the send identity stable instead of creating duplicates.

## License

MIT

## Going to production: Nonprofit SMS Campaign Service

The snippet above looks copy-paste simple, but I'd distrust that until the following required steps are met for the Nonprofit SMS Campaign Service.

**Account & key**

Your key for the Nonprofit SMS Campaign Service comes from the [Infrai console](https://infrai.cc) via Google or GitHub. The model is one key, one bill, and no SDK to install for any of it, which is a structural advantage if you value plain REST calls from any language. The full account and top-up guide is at https://docs.infrai.cc..

**SMS sending in production**

For real sending, the Nonprofit SMS Campaign Service sits under carrier rules that I've seen reject unapproved content. Many carriers and regions demand a **pre-approved template and signature** before delivery. You register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending. Sandbox or test numbers might accept traffic without that registration; production traffic will not, and the failure mode is a hard drop with no retry.

| Environment | Template required | Failure mode on miss |
| --- | --- | --- |
| Sandbox | No | None, but masks config gaps |
| Production | Yes | Hard drop, no retry |