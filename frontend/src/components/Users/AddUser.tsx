import { createUser, getRoles } from "@/utils/api";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AxiosError } from "axios";
import { ErrorResponse } from "@/types/types";
import LoadingSpinner from "../common/spinner";

interface Roles {
  name: string;
  _id: string;
}

const AddUser: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  const createUserMutation = useMutation(
    (userData: {
      email: string;
      password: string;
      name: string;
      role: string;
    }) => createUser(userData)
  );

  const { data: roles, isLoading, error } = useQuery("roles", getRoles);

  if (error) return <div>Error loading roles</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: newUser } = await createUserMutation.mutateAsync({
        email,
        password,
        name,
        role,
      });

      console.log(
        `User created: ${newUser.name} (${newUser.email}) with role: ${newUser.role}`
      );
      navigate("/users");
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      const errMsg = axiosError.response?.data?.errMsg;
      console.error("Error creating user:", errMsg);
      // Handle error state
    }
  };

  if (!user || user.role !== "admin") {
    return <p>You do not have permission to add users.</p>;
  }

  return (
    <div className="flex items-center justify-center py-0">
      <LoadingSpinner loading={isLoading} />
      <div className="mx-auto grid gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold">Add a new user</h1>
          <p className="text-balance text-muted-foreground">
            Fill in the details below to add a new user
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={setRole}>
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
            Add User
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddUser;
