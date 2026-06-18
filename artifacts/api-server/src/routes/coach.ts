import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { SendCoachMessageBody, SendCoachMessageResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are the Digital Safety Coach inside "Digital Village", a family digital safety app for parents. You advise parents raising digitally-aware kids aged 6–18.

Your expertise covers: healthy screen time, social media risks and readiness, cyberbullying, online privacy and data, scams and online predators, family technology agreements, digital footprint, and age-appropriate digital literacy.

How to respond:
- Be warm, practical, and non-judgmental. Parents come to you worried; reassure and empower them.
- Give concrete, actionable advice tailored to the child's age when it's mentioned. If age matters and isn't given, briefly ask or give age-banded guidance.
- Keep answers concise and easy to scan. Use short paragraphs or bullet points. Avoid jargon.
- Ground recommendations in widely accepted child-safety and developmental guidance. When evidence is mixed, say so plainly.
- Stay on topic. If asked something outside digital safety and parenting, gently steer back to how you can help.
- You are not a substitute for professional medical, legal, or emergency help. If a child may be in danger, urge the parent to contact local authorities or a relevant helpline.`;

router.post("/coach/chat", async (req, res): Promise<void> => {
  const parsed = SendCoachMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: parsed.data.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const reply = message.content
      .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!reply) {
      req.log.error({ stopReason: message.stop_reason }, "Coach returned empty reply");
      res.status(500).json({ error: "The coach could not generate a reply. Please try again." });
      return;
    }

    res.json(SendCoachMessageResponse.parse({ reply }));
  } catch (err) {
    req.log.error({ err }, "Coach chat request failed");
    res.status(500).json({ error: "The coach is unavailable right now. Please try again." });
  }
});

export default router;
