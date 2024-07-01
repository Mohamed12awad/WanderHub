import { updateUser, getUserById, getRoles } from "@/utils/api";
import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AxiosError, AxiosResponse } from "axios";
import { ErrorResponse } from "@/types/types";
import LoadingSpinner from "../common/spinner";

interface Roles {
  name: string;
  _id: string;
}

interface User {
  email: string;
  name: string;
  phone: string;
  role: Roles;
}

const EditUser: React.FC = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: userId } = useParams<{ id: string }>();

  const updateUserMutation = useMutation(
    (userData: {
      email: string;
      name: string;
      role: string;
      password?: string;
      phone: string;
    }) => updateUser(userId!, userData)
  );

  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery("roles", getRoles);
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
  } = useQuery(["user", userId], () => getUserById(userId!), {
    enabled: !!userId,
  });

  useEffect(() => {
    if (userData) {
      const user = (userData as AxiosResponse<User>).data;

      setEmail(user.email);
      setName(user.name);
      setRole(user.role._id);
      setPhone(user.phone);
    }
  }, [userData]);

  if (rolesError || userError) return <div>Error loading data</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: updatedUser } = await updateUserMutation.mutateAsync({
        email,
        name,
        role,
        password,
        phone,
      });

      console.log(
        `User updated: ${updatedUser.name} (${updatedUser.email}) with role: ${updatedUser.role}`
      );
      navigate("/users");
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      const errMsg = axiosError.response?.data?.errMsg;
      console.error("Error updating user:", errMsg);
      // Handle error state
    }
  };

  if (!user || user.role !== "admin") {
    return <p>You do not have permission to edit users.</p>;
  }

  return (
    <div className="flex items-center justify-center py-0">
      <LoadingSpinner loading={rolesLoading || userLoading} />

      <div className="mx-auto grid gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold">Edit user</h1>
          <p className="text-balance text-muted-foreground">
            Edit the details below to update the user
          </p>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="01234567890"
              value={phone}
              onChange={(e) => {
                e.target.value = e.target.value
                  .replace(/\D/g, "")
                  .substring(0, 11);
                setPhone(e.target.value);
              }}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={setRole} value={role}>
              <SelectTrigger>
                <SelectValue
                  placeholder="Select a Role"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roles?.data.map((item: Roles) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Update User
          </Button>
        </form>
      </div>
    </div>
  );
};

export default EditUser;
