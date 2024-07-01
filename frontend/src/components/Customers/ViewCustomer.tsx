import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { getCustomerById } from "@/utils/api";
import { Link, useParams } from "react-router-dom";
import { CircleArrowLeft, Edit } from "lucide-react";
import { Customer } from "@/types/types";
import { Button } from "../ui/button";
import LoadingSpinner from "../common/spinner";

// type Owner = {
//   name: string;
// };

const ViewCustomer: React.FC = () => {
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;

    const fetchCustomerData = async () => {
      try {
        const { data } = await getCustomerById(id);
        setCustomerData(data);
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };
    fetchCustomerData();
  }, [id]);

  if (!customerData) {
    return <LoadingSpinner loading={!customerData} />;
  }

  return (
    <main className="p-4">
      <LoadingSpinner loading={!customerData} />
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="flex items-center space-x-3">
            <Link to="/customers">
              <CircleArrowLeft className="text-xl" />
            </Link>
            <span>View Customer</span>
          </CardTitle>

          <Link to={`/customers/${id}/edit`}>
            <Button size="sm" className="h-8 gap-1 px-5">
              <Edit className="h-3.5 w-3.5 me-1" />
              Edit
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Personal Information
              </h2>
              <InfoItem label="Name" value={customerData.name} />
              <InfoItem label="Phone" value={customerData.phone} />
              <InfoItem label="Mobile" value={customerData.mobile} />
              <InfoItem label="Email" value={customerData.email} />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Work Related</h2>
              <InfoItem label="Location" value={customerData.location} />
              <InfoItem
                label="Owner"
                value={
                  typeof customerData.owner !== "string"
                    ? customerData.owner.name
                    : "N/A"
                }
              />
              <InfoItem label="Status" value={customerData.status} />
              <InfoItem label="Notes" value={customerData.notes} />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Address Information
              </h2>
              <InfoItem label="Street" value={customerData.address.street} />
              <InfoItem label="City" value={customerData.address.city} />
              <InfoItem label="State" value={customerData.address.state} />
              <InfoItem label="ZIP Code" value={customerData.address.zip} />
              <InfoItem label="Country" value={customerData.address.country} />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Identification Information
              </h2>
              <InfoItem
                label="Passport Number"
                value={customerData.identification.passportNumber}
              />
              <InfoItem
                label="National ID"
                value={customerData.identification.nationalId}
              />
              <InfoItem
                label="Date of Birth"
                value={customerData.dateOfBirth}
              />
              <InfoItem label="Gender" value={customerData.gender} />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Emergency Contact</h2>
              <InfoItem
                label="Name"
                value={customerData.emergencyContact.name}
              />
              <InfoItem
                label="Phone"
                value={customerData.emergencyContact.phone}
              />
              <InfoItem
                label="Relationship"
                value={customerData.emergencyContact.relationship}
              />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Loyalty Program</h2>
              <InfoItem
                label="Member ID"
                value={customerData.loyaltyProgram.memberId}
              />
              <InfoItem
                label="Points"
                value={customerData.loyaltyProgram.points}
              />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                Payment Information
              </h2>
              <InfoItem
                label="Card Type"
                value={customerData.paymentInformation.cardType}
              />
              <InfoItem
                label="Card Number"
                value={customerData.paymentInformation.cardNumber}
              />
              <InfoItem
                label="Expiration Date"
                value={customerData.paymentInformation.expirationDate}
              />
            </section>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

const InfoItem: React.FC<{ label: string; value: string | number }> = ({
  label,
  value,
}) => (
  <div className="mb-3 grid grid-cols-2">
    <Label className="block text-sm font-medium text-gray-700">{label}</Label>
    <p className="mt-1 text-base text-gray-900">{value}</p>
  </div>
);

export default ViewCustomer;
