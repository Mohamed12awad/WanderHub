// validationSchema.js
import * as yup from "yup";

const validationSchema = yup.object().shape({
  name: yup.string().required("Please provide a customer name"),
  phone: yup
    .string()
    .required("Phone number is required")
    .min(11, "Phone must be at least 11 characters"),
  mobile: yup
    .string()
    .required("Mobile number is required")
    .min(11, "Mobile must be at least 11 characters"),
  email: yup.string().email("Invalid email format"),
  address: yup.object().shape({
    street: yup.string().nullable(),
    city: yup.string().nullable(),
    state: yup.string().nullable(),
    zip: yup.string().nullable(),
    country: yup.string().nullable(),
  }),
  identification: yup.object().shape({
    passportNumber: yup.string().nullable(),
    nationalId: yup.string().nullable(),
  }),
  dateOfBirth: yup.date().nullable(),
  gender: yup.string().oneOf(["Male", "Female"]).nullable(),
  preferredContactMethod: yup
    .string()
    .oneOf(["Phone", "Email", "SMS", "Whatsapp"])
    .nullable(),
  paymentInformation: yup.object().shape({
    cardType: yup.string().nullable(),
    cardNumber: yup.string().nullable(),
    expirationDate: yup.date().nullable(),
  }),
  loyaltyProgram: yup.object().shape({
    memberId: yup.string().nullable(),
    points: yup.number().nullable(),
  }),
  emergencyContact: yup.object().shape({
    name: yup.string().nullable(),
    phone: yup.string().nullable(),
    relationship: yup.string().nullable(),
  }),
  location: yup.string().nullable(),
});

export default validationSchema;
