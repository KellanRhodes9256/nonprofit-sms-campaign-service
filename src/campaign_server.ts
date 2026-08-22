import express from "express";
import { ZodError } from "zod";
import { dispatchCampaign } from "./campaign_dispatcher.js";
import { campaignRequestSchema } from "./campaign_schema.js";
import { InfraiError, infraiSmsFromEnv } from "./infrai_sms.js";

const server = express();
server.use(express.json({ limit: "128kb" }));

server.post("/campaigns/send", async (request, response) => {
  try {
    const campaign = campaignRequestSchema.parse(request.body);
    const report = await dispatchCampaign(campaign, infraiSmsFromEnv());
    response.status(200).json(report);
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "invalid_campaign", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.code, message: error.message });
      return;
    }
    response.status(500).json({ error: "campaign_dispatch_failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Campaign service listening on http://localhost:${port}`));
