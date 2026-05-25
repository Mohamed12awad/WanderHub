import mongoose, { Document, Schema, Types } from "mongoose";

export type TimelineEventType =
  | "deal.created"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "payment.received"
  | "payment.deleted"
  | "task.created"
  | "task.completed"
  | "note.added"
  | "contact.created"
  | "activity.logged"
  | "custom";

export interface ITimelineEvent extends Document {
  eventType: TimelineEventType;
  title: string;
  payload?: Record<string, unknown>;
  linkedTo: Types.ObjectId;
  linkedModel: "Customer" | "Deal";
  triggeredBy?: Types.ObjectId;
  isSystem: boolean;
  createdAt: Date;
}

const timelineEventSchema = new Schema<ITimelineEvent>(
  {
    eventType: {
      type: String,
      enum: [
        "deal.created", "deal.stage_changed", "deal.won", "deal.lost",
        "payment.received", "payment.deleted",
        "task.created", "task.completed",
        "note.added",
        "contact.created", "activity.logged", "custom",
      ],
      required: true,
    },
    title: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    linkedTo: { type: Schema.Types.ObjectId, required: true, refPath: "linkedModel" },
    linkedModel: { type: String, enum: ["Customer", "Deal"], required: true },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

timelineEventSchema.index({ linkedTo: 1, linkedModel: 1, createdAt: -1 });

export default mongoose.model<ITimelineEvent>("TimelineEvent", timelineEventSchema);
