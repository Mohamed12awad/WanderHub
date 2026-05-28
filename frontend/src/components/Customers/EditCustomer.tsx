import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { updateCustomer, getCustomerById, getUsers } from "@/utils/api";

const LEAD_SOURCES = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Other"];
import { Link, useNavigate, useParams } from "react-router-dom";
import DynamicFields from "@/components/common/DynamicFields";
import { CircleArrowLeft } from "lucide-react";
import { Customer } from "@/types/types";
import { useAuth } from "@/contexts/authContext";

interface User {
  _id: string;
  name: string;
}

const initialFormData = {
  _id: "",
  name: "",
  phone: "",
  mobile: "",
  email: "",
  address: {
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  },
  identification: {
    passportNumber: "",
    nationalId: "",
  },
  dateOfBirth: "",
  gender: "",
  preferredContactMethod: "",
  paymentInformation: {
    cardType: "",
    cardNumber: "",
    expirationDate: "",
  },
  loyaltyProgram: {
    memberId: "",
    points: "",
  },
  emergencyContact: {
    name: "",
    phone: "",
    relationship: "",
  },
  location: "",
  source: "",
  status: "Draft",
  owner: "",
  notes: "",
  customFields: {} as Record<string, string>,
};

/** Format an ISO datetime string or Date to YYYY-MM-DD for <input type="date">. */
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

const EditCustomer = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const { id } = useParams<{ id: string }>();
  const [users, setUsers] = useState([]);
  const { user } = useAuth();
  const originalRef = useRef<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    const fetchCustomerData = async () => {
      try {
        const { data: users } = await getUsers();
        setUsers(users);
        const { data } = await getCustomerById(id);
        const loaded = {
          ...initialFormData,
          ...data,
          dateOfBirth: toDateInputValue(data.dateOfBirth),
          owner: data.owner?._id || "",
          source: data.source ?? "",
          customFields: data.customFields ?? {},
        };
        setFormData(loaded);
        originalRef.current = JSON.stringify(loaded);
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };
    fetchCustomerData();
  }, [id]);

  const isDirty = originalRef.current !== null && JSON.stringify(formData) !== originalRef.current;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    let { value } = e.target;
    if (["phone", "mobile"].includes(name)) {
      value = value.replace(/\D/g, "").substring(0, 11);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, address: { ...prev.address, [name]: value } }));
  };

  const handleIdentificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, identification: { ...prev.identification, [name]: value } }));
  };

  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [name]: value } }));
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, paymentInformation: { ...prev.paymentInformation, [name]: value } }));
  };

  const handleLoyaltyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, loyaltyProgram: { ...prev.loyaltyProgram, [name]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    try {
      const customerData: Customer = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || null,
      } as any;
      setIsLoading(true);
      await updateCustomer(id, customerData);
      setIsLoading(false);
      navigate("/customers/" + id);
    } catch (error) {
      setIsLoading(false);
      console.error("Error updating customer:", error);
    }
  };

  return (
    <main className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Link to={`/customers/${id}`}>
              <CircleArrowLeft className="me-3" />
            </Link>
            Edit Customer
            {isDirty && (
              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
                Unsaved changes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Information */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Personal Information
              </h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="name">
                  Name <span className="text-red-700 font-bold">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="phone">
                  Phone <span className="text-red-700 font-bold">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="mobile">
                  Mobile
                </Label>
                <Input
                  id="mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Work Related */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Work Related</h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="location">
                  Location
                </Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, location: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    <SelectItem value="Alex">Alex</SelectItem>
                    <SelectItem value="Cairo">Cairo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="owner">
                  Owner <span className="text-red-700 font-bold">*</span>
                </Label>
                <Select
                  value={formData.owner}
                  required
                  disabled={
                    ["admin", "super admin"].includes(user!.role) ? false : true
                  }
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, owner: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    {users?.map((item: User) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="Status">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  required
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Called">Called</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Offer Sent">Offer Sent</SelectItem>
                    <SelectItem value="Deal Closed">Deal Closed</SelectItem>
                    <SelectItem value="Deal Lost">Deal Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3">Lead Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, source: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How did they find you?" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="notes">
                  Notes
                </Label>
                <Input
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="flex flex-col">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Address Information
              </h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="address.street">
                  Street
                </Label>
                <Input
                  id="address.street"
                  name="street"
                  value={formData.address.street}
                  onChange={handleAddressChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="address.city">
                  City
                </Label>
                <Input
                  id="address.city"
                  name="city"
                  value={formData.address.city}
                  onChange={handleAddressChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="address.state">
                  State
                </Label>
                <Input
                  id="address.state"
                  name="state"
                  value={formData.address.state}
                  onChange={handleAddressChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="address.zip">
                  ZIP Code
                </Label>
                <Input
                  id="address.zip"
                  name="zip"
                  value={formData.address.zip}
                  onChange={handleAddressChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="address.country">
                  Country
                </Label>
                <Input
                  id="address.country"
                  name="country"
                  value={formData.address.country}
                  onChange={handleAddressChange}
                />
              </div>
            </div>

            {/* Identification Information */}
            <div className="flex flex-col">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Identification Information
              </h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="passportNumber">
                  Passport Number
                </Label>
                <Input
                  id="passportNumber"
                  name="passportNumber"
                  value={formData.identification.passportNumber}
                  onChange={handleIdentificationChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="nationalId">
                  National ID
                </Label>
                <Input
                  id="nationalId"
                  name="nationalId"
                  value={formData.identification.nationalId}
                  onChange={handleIdentificationChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="dateOfBirth">
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="gender">
                  Gender
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Emergency Contact</h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="emergencyContact.name">
                  Name
                </Label>
                <Input
                  id="emergencyContact.name"
                  name="name"
                  value={formData.emergencyContact.name}
                  onChange={handleEmergencyContactChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="emergencyContact.phone">
                  Phone
                </Label>
                <Input
                  id="emergencyContact.phone"
                  name="phone"
                  value={formData.emergencyContact.phone}
                  onChange={handleEmergencyContactChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="emergencyContact.relationship">
                  Relationship
                </Label>
                <Input
                  id="emergencyContact.relationship"
                  name="relationship"
                  value={formData.emergencyContact.relationship}
                  onChange={handleEmergencyContactChange}
                />
              </div>
            </div>

            {/* Loyalty Program */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Loyalty Program</h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="loyaltyProgram.memberId">
                  Member ID
                </Label>
                <Input
                  id="loyaltyProgram.memberId"
                  name="memberId"
                  value={formData.loyaltyProgram.memberId}
                  onChange={handleLoyaltyChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="loyaltyProgram.points">
                  Points
                </Label>
                <Input
                  id="loyaltyProgram.points"
                  name="points"
                  value={formData.loyaltyProgram.points}
                  onChange={handleLoyaltyChange}
                />
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Payment Information
              </h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="paymentInformation.cardType">
                  Card Type
                </Label>
                <Input
                  id="paymentInformation.cardType"
                  name="cardType"
                  value={formData.paymentInformation.cardType}
                  onChange={handlePaymentChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="paymentInformation.cardNumber">
                  Card Number
                </Label>
                <Input
                  id="paymentInformation.cardNumber"
                  name="cardNumber"
                  value={formData.paymentInformation.cardNumber}
                  onChange={handlePaymentChange}
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="paymentInformation.expirationDate">
                  Expiration Date
                </Label>
                <Input
                  id="paymentInformation.expirationDate"
                  name="expirationDate"
                  type="date"
                  value={formData.paymentInformation.expirationDate}
                  onChange={handlePaymentChange}
                />
              </div>
            </div>

            <DynamicFields
              module="customers"
              values={formData.customFields}
              onChange={(k, v) => setFormData((prev) => ({ ...prev, customFields: { ...prev.customFields, [k]: v } }))}
            />

            <Button type="submit" className="col-span-2" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Customer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default EditCustomer;
