// types.ts
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface LoyaltyProgram {
  memberId: string;
  points: number | string;
}

export interface PaymentInformation {
  cardType: string;
  cardNumber: string;
  expirationDate: string;
}
export interface Owner {
  name: string;
}

export interface Customer {
  _id?: string;
  name: string;
  phone: string;
  mobile: string;
  email: string;
  location: string;
  owner: Owner | string;
  status: string;
  notes: string;
  address: Address;
  identification: {
    passportNumber: string;
    nationalId: string;
  };
  dateOfBirth: string;
  gender: string;
  emergencyContact: EmergencyContact;
  loyaltyProgram: LoyaltyProgram;
  paymentInformation: PaymentInformation;
}
export interface User {
  _id: string;
  name: string;
  email: string;
  active: boolean;
  role: {
    name: string;
  };
  createdAt: string;
  handleDelete: (id: string) => void;
}
export interface ErrorResponse {
  errMsg?: string;
  message?: string;
}

// export interface Customer {
//   _id: string;
//   name: string;
// }

export interface Room {
  _id: string;
  roomNumber: string;
}

export interface BookingData {
  customer: string;
  room: string;
  startDate: Date;
  endDate: Date;
  price: number;
  currency: string;
  totalPaid: number;
  status: string;
  numberOfPeople: number;
  bookingLocation: string;
  extraBusSeats: number;
  notes: string;
}
export interface UserData {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
}
export interface PaymentData {
  booking: string;
  amount: number;
  date: Date | string;
}
export interface BookingData {
  customer: string;
  room: string;
  startDate: Date;
  endDate: Date;
  price: number;
  currency: string;
  totalPaid: number;
  status: string;
  numberOfPeople: number;
  extraBusSeats: number;
  bookingLocation: string;
  notes: string;
}
// export interface FormData {
//   name: string;
//   phone: string;
//   mobile: string;
//   email: string;
//   address: {
//     street: string;
//     city: string;
//     state: string;
//     zip: string;
//     country: string;
//   };
//   identification: {
//     passportNumber: string;
//     nationalId: string;
//   };
//   dateOfBirth: string;
//   gender: string;
//   preferredContactMethod: string;
//   paymentInformation: {
//     cardType: string;
//     cardNumber: string;
//     expirationDate: string;
//   };
//   loyaltyProgram: {
//     memberId: string;
//     points: string;
//   };
//   emergencyContact: {
//     name: string;
//     phone: string;
//     relationship: string;
//   };
//   location: string;
//   owner: string;
//   notes: string;
//   status: string;
// }
