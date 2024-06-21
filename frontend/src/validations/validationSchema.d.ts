import * as yup from "yup";

const validationSchema: yup.SchemaOf<{
  name: string;
  phone: string;
  mobile: string;
  email: string | null | undefined;
  address: {
    street?: string | null | undefined;
    city?: string | null | undefined;
    state?: string | null | undefined;
    zip?: string | null | undefined;
    country?: string | null | undefined;
  };
  identification: {
    passportNumber?: string | null | undefined;
    nationalId?: string | null | undefined;
  };
  dateOfBirth?: Date | null | undefined;
  gender?: "Male" | "Female" | null | undefined;
  preferredContactMethod?:
    | "Phone"
    | "Email"
    | "SMS"
    | "Whatsapp"
    | null
    | undefined;
  bookingHistory?:
    | yup.ArraySchema<yup.Schema<string | null | undefined>>
    | null
    | undefined;
  paymentInformation?: {
    cardType?: string | null | undefined;
    cardNumber?: string | null | undefined;
    expirationDate?: Date | null | undefined;
  };
  loyaltyProgram?: {
    memberId?: string | null | undefined;
    points?: number | null | undefined;
  };
  emergencyContact?: {
    name?: string | null | undefined;
    phone?: string | null | undefined;
    relationship?: string | null | undefined;
  };
  location?: string | null | undefined;
  owner?: yup.Schema.Types.ObjectId | null | undefined;
}>;

export default validationSchema;
