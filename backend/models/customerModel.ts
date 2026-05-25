import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  phone: string;
  mobile?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  identification?: {
    passportNumber?: string;
    nationalId?: string;
  };
  dateOfBirth?: Date;
  gender?: string;
  preferredContactMethod?: string;
  bookingHistory: mongoose.Types.ObjectId[];
  paymentInformation?: {
    cardType?: string;
    cardNumber?: string;
    expirationDate?: Date;
  };
  loyaltyProgram?: {
    memberId?: string;
    points?: number;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  location?: string;
  owner?: mongoose.Types.ObjectId;
  status?: string;
  notes?: string;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: [true, "Please set a customer name"], trim: true },
    phone: {
      type: String,
      required: [true, "Please Provide a phone Number"],
      unique: true,
      minlength: [11, "Phone can't be less than 11 characters"],
    },
    mobile: { type: String },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String },
    },
    identification: {
      passportNumber: { type: String },
      nationalId: { type: String },
    },
    dateOfBirth: { type: Date },
    gender: { type: String },
    preferredContactMethod: { type: String },
    bookingHistory: [{ type: Schema.Types.ObjectId, ref: "Deal" }],
    paymentInformation: {
      cardType: { type: String },
      cardNumber: { type: String },
      expirationDate: { type: Date },
    },
    loyaltyProgram: {
      memberId: { type: String },
      points: { type: Number },
    },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String },
    },
    location: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

customerSchema.index({ name: "text", email: 1 });
customerSchema.index({ status: 1, createdAt: -1 });
customerSchema.index({ owner: 1 });

export default mongoose.model<ICustomer>("Customer", customerSchema);
