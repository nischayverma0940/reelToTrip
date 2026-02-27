import { Router, Request, Response } from "express";
import { reelInterpretationAgent } from "../agents/reelInterpretation/agent";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const reelUrl = req.body?.reelUrl;

  if (typeof reelUrl !== "string" || !reelUrl.trim()) {
    res.status(400).json({ error: "Missing or invalid reelUrl" });
    return;
  }

  try {
    const result = await reelInterpretationAgent(reelUrl.trim());
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e instanceof Error ? e.message : "Interpretation failed",
    });
  }
});

export default router;
