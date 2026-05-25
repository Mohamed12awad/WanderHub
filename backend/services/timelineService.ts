import TimelineEvent, { TimelineEventType } from "../models/timelineEventModel";
import { Types } from "mongoose";

export async function logTimeline(
  eventType: TimelineEventType,
  title: string,
  linkedTo: string | Types.ObjectId,
  linkedModel: "Customer" | "Deal",
  payload?: Record<string, unknown>,
  triggeredBy?: string | Types.ObjectId
): Promise<void> {
  try {
    await TimelineEvent.create({
      eventType,
      title,
      linkedTo,
      linkedModel,
      payload,
      triggeredBy: triggeredBy || undefined,
      isSystem: !triggeredBy,
    });
  } catch (err) {
    // Timeline logging is a side-effect — never let it fail the main request
    console.error("[TimelineService] Failed to log event:", err);
  }
}
