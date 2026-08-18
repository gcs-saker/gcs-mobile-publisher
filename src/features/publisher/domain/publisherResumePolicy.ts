import type { PublishSession } from "../../../types";

export type PublisherResumeDecision = "renew" | "reconnect";

export function decidePublisherResume(
  session: PublishSession | null,
  nowMs: number,
): PublisherResumeDecision {
  if (!session) return "reconnect";
  const renewalExpiryMs = Date.parse(session.renewalTokenExpiresAt);
  if (!Number.isFinite(renewalExpiryMs) || renewalExpiryMs <= nowMs) return "reconnect";
  return "renew";
}
