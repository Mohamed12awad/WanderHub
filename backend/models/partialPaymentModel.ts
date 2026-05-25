import mongoose, { Schema, Document } from "mongoose";

export interface IPartialPayment extends Document {
  booking: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  date: Date;
  createdBy?: mongoose.Types.ObjectId;
  method: string;
  notes?: string;
}

async function syncDealTotalPaid(dealId: mongoose.Types.ObjectId) {
  const Deal = mongoose.model("Deal");
  const result = await PartialPayment.aggregate([
    { $match: { booking: dealId } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const total = result.length ? (result[0].total as number) : 0;
  await Deal.findByIdAndUpdate(dealId, { totalPaid: total });
}

const partialPaymentSchema = new Schema<IPartialPayment>(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Deal", required: true },
    amount: { type: Number, required: true, min: [1, "Amount can not be less than 1"] },
    currency: { type: String, enum: ["EGP", "USD", "Other"], default: "EGP" },
    date: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    method: {
      type: String,
      enum: ["cash", "bank transfer", "vodafone cash", "cheque"],
      default: "cash",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

partialPaymentSchema.post("save", async function () {
  await syncDealTotalPaid(this.booking);
});

partialPaymentSchema.post("findOneAndDelete", async function (doc: IPartialPayment | null) {
  if (doc) await syncDealTotalPaid(doc.booking);
});

partialPaymentSchema.post("deleteMany", async function () {
  // bulk deletes on deal cascade-delete don't need totalPaid sync
});

partialPaymentSchema.index({ booking: 1 });

const PartialPayment = mongoose.model<IPartialPayment>("PartialPayment", partialPaymentSchema);
export default PartialPayment;
