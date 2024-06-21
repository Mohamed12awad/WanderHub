const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { isEmail } = require("validator");

const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please set a customer name"],
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      minlength: [11, "Phone can't be less than 11 characters"],
      required: [true, "Please Provide a phone Number"],
    },
    mobile: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      // validate: [isEmail, "Enter a valid email"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    address: {
      street: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      state: {
        type: String,
        required: false,
      },
      zip: {
        type: String,
        required: false,
      },
      country: {
        type: String,
        required: false,
      },
    },
    identification: {
      passportNumber: {
        type: String,
        required: false,
      },
      nationalId: {
        type: String,
        required: false,
      },
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    gender: {
      type: String,
      // enum: ["Male", "Female"],
      required: false,
    },
    preferredContactMethod: {
      type: String,
      // enum: ["Phone", "Email", "SMS", "Whatsapp"],
      required: false,
    },
    bookingHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
    paymentInformation: {
      cardType: {
        type: String,
        required: false,
      },
      cardNumber: {
        type: String,
        required: false,
      },
      expirationDate: {
        type: Date,
        required: false,
      },
    },
    loyaltyProgram: {
      memberId: {
        type: String,
        required: false,
      },
      points: {
        type: Number,
        required: false,
      },
    },
    emergencyContact: {
      name: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        required: false,
      },
      relationship: {
        type: String,
        required: false,
      },
    },
    location: {
      type: String,
      required: false,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);
module.exports = Customer;
