// @ts-nocheck
import React, { useState } from "react";
import { useCreateExpense, useListExpenses } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, TrendingDown } from "lucide-react";

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Shop Operations",
    payment_method: "cash",
    reference: "",
    description: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const { data, isLoading } = useListExpenses({ query: searchTerm });
  const createExpense = useCreateExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const expenses = data?.data ?? data?.items ?? [];
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount ?? 0), 0) || 0;

  const updateForm = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submitExpense = () => {
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Enter title and amount" });
      return;
    }
    createExpense.mutate(
      {
        data: {
          ...form,
          amount,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Expense recorded" });
          setOpen(false);
          setForm({
            title: "",
            amount: "",
            category: "Shop Operations",
            payment_method: "cash",
            reference: "",
            description: "",
            expense_date: new Date().toISOString().slice(0, 10),
          });
          queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to record expense" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <Button onClick={() => setOpen(true)} data-testid="button-record-expense">
          <Plus className="h-4 w-4 mr-2" />
          Record Expense
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search expenses..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.expense_date ?? expense.createdAt ?? expense.created_at)}</TableCell>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell className="capitalize">{expense.payment_method || "-"}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(expense.amount)}</TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No expenses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>
              Add a new expense to track business costs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => updateForm("title", e.target.value)} data-testid="input-expense-title" />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min="1" value={form.amount} onChange={(e) => updateForm("amount", e.target.value)} data-testid="input-expense-amount" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.expense_date} onChange={(e) => updateForm("expense_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(value) => updateForm("category", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Shop Operations">Shop Operations</SelectItem>
                    <SelectItem value="Fabric and Materials">Fabric and Materials</SelectItem>
                    <SelectItem value="Tailoring Labour">Tailoring Labour</SelectItem>
                    <SelectItem value="Embroidery and Printing">Embroidery and Printing</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Rent and Utilities">Rent and Utilities</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(value) => updateForm("payment_method", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Reference</Label>
                <Input value={form.reference} onChange={(e) => updateForm("reference", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={submitExpense} disabled={createExpense.isPending} data-testid="button-save-expense">
              Save Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
