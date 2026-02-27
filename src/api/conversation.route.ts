import { Router, Request, Response } from "express";
import { runPipeline } from "../orchestrator/orchestrator";
import {
  getConversation,
  appendTurn,
  buildHistoryText,
  updateConversationCurrency,
} from "../memory/conversationState";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { conversationId, message } = req.body ?? {};
  const currency: string =
    typeof req.body?.currency === "string" ? req.body.currency : "USD";

  if (typeof conversationId !== "string" || !conversationId.trim()) {
    res.status(400).json({ error: "Missing or invalid conversationId" });
    return;
  }

  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Missing or invalid message" });
    return;
  }

  const state = getConversation(conversationId.trim());
  if (!state) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  updateConversationCurrency(state.id, currency);
  appendTurn(state.id, "user", message.trim());

  const historyText = buildHistoryText(state);

  try {
    const result = await runPipeline(state.reelUrl, state.currency, historyText);

    appendTurn(state.id, "agent", result.summary);

    res.json({
      conversationId: state.id,
      summary: result.summary,
      history: buildHistoryText(state),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e instanceof Error ? e.message : "Conversation pipeline failed",
    });
  }
});

export default router;

