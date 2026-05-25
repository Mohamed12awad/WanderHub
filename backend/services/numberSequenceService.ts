import NumberSequence from "../models/numberSequenceModel";

export async function nextNumber(
  key: string,
  prefix = "",
  padLength = 4,
  separator = "-"
): Promise<string> {
  const seq = await NumberSequence.findOneAndUpdate(
    { key },
    { $inc: { lastNumber: 1 }, $setOnInsert: { prefix, padLength, separator } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const padded = String(seq.lastNumber).padStart(seq.padLength, "0");
  return seq.prefix ? `${seq.prefix}${seq.separator}${padded}` : padded;
}
