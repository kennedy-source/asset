// @ts-nocheck
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirm: "",
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    registerMutation.mutate(
      {
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Admin registered", description: "Please log in." });
          setLocation("/login");
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: (err as any).data?.error || "Error",
          });
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center bg-primary/5 pb-6 pt-8 border-b">
          <CardTitle className="text-3xl font-bold text-primary">
            PAJOY
          </CardTitle>
          <CardDescription>Register Administrator Account</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {(["name", "email", "phone", "password", "confirm"] as const).map(
                (field) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="capitalize">
                          {field === "confirm" ? "Confirm Password" : field}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type={
                              field === "password" || field === "confirm"
                                ? "password"
                                : field === "email"
                                  ? "email"
                                  : "text"
                            }
                            {...f}
                            data-testid={`input-${field}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ),
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending
                  ? "Creating account..."
                  : "Create Admin Account"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
