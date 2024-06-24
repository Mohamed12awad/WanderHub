import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import { Customer } from "@/types/types";
// import { useQuery } from "react-query";

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
  status: "Draft",
  owner: "",
  notes: "",
};

const EditCustomer = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const { id } = useParams<{ id: string }>();
  const [users, setUsers] = useState([]);
  //   const { data: users } = useQuery("users", getUsers);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    const fetchCustomerData = async () => {
      try {
        const { data: users } = await getUsers();
        setUsers(users);
        const { data } = await getCustomerById(id);
        setFormData({ ...data, owner: data.owner._id });
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };
    fetchCustomerData();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    let { value } = e.target;
    if (["phone", "mobile"].includes(name)) {
      value = value.replace(/\D/g, "").substring(0, 11);
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      address: {
        ...prevData.address,
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    try {
      const customerData: Customer = formData;
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
          <CardTitle className="flex">
            <Link to="/customers">
              <CircleArrowLeft className="me-3 " />
            </Link>
            Edit Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
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
              <h2 className="text-lg font-semibold mb-2">Work Related</h2>
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
                  <SelectContent className="overflow-y-auto max-h-[10rem]">
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
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, owner: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[10rem]">
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
                  <SelectContent className="overflow-y-auto max-h-[10rem]">
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
              <h2 className="text-lg font-semibold mb-2">
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
              <h2 className="text-lg font-semibold mb-2">
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  <SelectContent className="overflow-y-auto max-h-[10rem]">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Emergency Contact</h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="emergencyContact.name">
                  Name
                </Label>
                <Input
                  id="emergencyContact.name"
                  name="name"
                  value={formData.emergencyContact.name}
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Loyalty Program */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Loyalty Program</h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="loyaltyProgram.memberId">
                  Member ID
                </Label>
                <Input
                  id="loyaltyProgram.memberId"
                  name="memberId"
                  value={formData.loyaltyProgram.memberId}
                  onChange={handleChange}
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
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <Label
                  className="my-3"
                  htmlFor="paymentInformation.expirationDate"
                >
                  Expiration Date
                </Label>
                <Input
                  id="paymentInformation.expirationDate"
                  name="expirationDate"
                  type="date"
                  value={formData.paymentInformation.expirationDate}
                  onChange={handleChange}
                />
              </div>
            </div>

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
