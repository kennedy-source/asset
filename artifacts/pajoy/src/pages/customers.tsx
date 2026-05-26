import { useState } from "react";
import {
  type Customer,
  type CustomerInput,
  useListCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";

import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Search, Upload } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  schoolName: z.string().optional(),
  customer_type: z.string().optional(),
});

type CustomerForm = z.infer<typeof schema>;
type CustomerWithSchool = Customer & { schoolName?: string | null };

const getCustomerSchoolName = (customer: CustomerWithSchool) =>
  customer.schoolName ?? "";

/**
 * Temporary delete function because API client does NOT include delete endpoint
 */
const deleteCustomer = async (id: number) => {
  return fetch(`/api/customers/${id}`, {
    method: "DELETE",
  });
};

export default function Customers() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useListCustomers({ page, limit } as any);

  const customers = ((data as any)?.data ?? (data as any)?.items ?? []) as CustomerWithSchool[];
  const total = data?.total ?? 0;

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  const form = useForm<CustomerForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      schoolName: "",
      customer_type: "individual",
    },
  });

  const filtered = customers.filter((c) => {
    return (
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search)
    );
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      email: "",
      phone: "",
      address: "",
      schoolName: "",
      customer_type: "individual",
    });
    setOpen(true);
  };

  const openEdit = (c: CustomerWithSchool) => {
    setEditing(c);
    form.reset({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      schoolName: getCustomerSchoolName(c),
      customer_type: c.customer_type || "individual",
    });
    setOpen(true);
  };

  const onSubmit = (values: CustomerForm) => {
    const payload = {
      name: values.name,
      email: values.email || null,
      phone: values.phone ?? "",
      address: values.address || null,
      customer_type: values.customer_type || "individual",
      alt_phone: null,
      city: null,
      id_number: null,
      credit_limit: null,
      notes: values.schoolName || null,
    };

    const invalidate = () =>
      queryClient.invalidateQueries({
        queryKey: getListCustomersQueryKey(),
      });

    if (editing) {
      updateMutation.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Customer updated" });
            setOpen(false);
            invalidate();
          },
          onError: (error: any) => {
            console.error("Update error:", error);
            toast({ variant: "destructive", title: "Update failed", description: error.message || "Unknown error" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Customer created" });
            setOpen(false);
            form.reset();
            invalidate();
          },
          onError: (error: any) => {
            console.error("Create error:", error);
            toast({ variant: "destructive", title: "Create failed", description: error.message || "Unknown error" });
          },
        }
      );
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete customer "${name}"?`)) return;

    try {
      await deleteCustomer(id);

      toast({ title: "Customer deleted" });

      queryClient.invalidateQueries({
        queryKey: getListCustomersQueryKey(),
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Delete failed",
      });
    }
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) {
      toast({ variant: "destructive", title: "No data to import" });
      return;
    }

    setIsBulkImporting(true);
    const lines = bulkData.trim().split("\n");
    let successCount = 0;
    let errorCount = 0;

    for (const line of lines) {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length < 1) continue;

      const customer = {
        name: parts[0] || "",
        phone: parts[1] || "",
        email: parts[2] || null,
        address: parts[3] || null,
        customer_type: parts[4] || "individual",
        alt_phone: null,
        city: null,
        id_number: null,
        credit_limit: null,
        notes: parts[5] || null,
      };

      try {
        await createMutation.mutateAsync({ data: customer });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsBulkImporting(false);
    setBulkOpen(false);
    setBulkData("");
    
    queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
    
    toast({
      title: "Bulk import completed",
      description: `${successCount} customers imported, ${errorCount} failed`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} total customers
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>School</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {(c as any).customer_type || "individual"}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.schoolName || "—"}</TableCell>

                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(c.id, c.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && (
        <PaginationControls
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Customer" : "New Customer"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Update customer information" : "Add a new customer to the system"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {[
                { name: "name" as const, label: "Name" },
                { name: "phone" as const, label: "Phone" },
                { name: "email" as const, label: "Email" },
                { name: "address" as const, label: "Address" },
                { name: "schoolName" as const, label: "School Name" },
              ].map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editing ? "Update" : "Create"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Customers</DialogTitle>
            <DialogDescription>
              Import multiple customers at once using CSV format (Name, Phone, Email, Address, Type, Notes)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="John Doe, 0712345678, john@example.com, 123 Main St, individual, Regular customer&#10;Jane Smith, 0723456789, jane@example.com, 456 Oak Ave, school, School customer"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <div className="text-sm text-muted-foreground">
              Format: Name, Phone, Email, Address, Type (individual/school), Notes
            </div>
            <Button
              onClick={handleBulkImport}
              disabled={isBulkImporting}
              className="w-full"
            >
              {isBulkImporting ? "Importing..." : "Import Customers"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
