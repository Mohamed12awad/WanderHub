import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  active: boolean;
  role: mongoose.Types.ObjectId | { name: string };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = Model<IUser>;

const userSchema = new Schema<IUser, UserModel>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: {
      type: String,
      required: [true, "Please Provide a phone Number"],
      minlength: [11, "Phone can't be less than 11 characters"],
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    active: { type: Boolean, default: true },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    return next(err as Error);
  }
});

userSchema.methods.comparePassword = function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser, UserModel>("User", userSchema);
