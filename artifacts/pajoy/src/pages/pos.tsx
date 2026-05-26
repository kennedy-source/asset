// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import {
  useListProducts,
  useListCustomers,
  useCreateSale,
  getListSalesQueryKey,
  getListProductsQueryKey,
  getGetDashboardSummaryQueryKey,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  CreditCard,
} from "lucide-react";
import { clearOcrDraft, loadOcrDraft } from "@/lib/ocr-drafts";

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

interface CartItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  stock: number;
}

const PAYMENT_METHODS = ["CASH", "PAYSTACK", "CARD", "BANK_TRANSFER", "CHEQUE"];

export default function POS() {
  const { data: productsData } = useListProducts();
  const { data: customersData } = useListCustomers();
  const products = Array.isArray(productsData)
    ? productsData
    : (productsData?.items ?? []);
  const customers = Array.isArray(customersData)
    ? customersData
    : (customersData?.items ?? []);
  const createSale = useCreateSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("walkin");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const draft = loadOcrDraft("sale");
    if (!draft) return;
    const mapped: CartItem[] = draft.items
      .map((item) => {
        const product = products.find(
          (p) => p.name.toLowerCase() === item.name.toLowerCase(),
        );
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          quantity: Math.min(item.quantity, product.stockQuantity),
          unitPrice: item.unitPrice || product.sellingPrice,
          stock: product.stockQuantity,
        };
      })
      .filter((v): v is CartItem => Boolean(v));
    if (mapped.length > 0) {
      setCart(mapped);
      toast({ title: "OCR draft loaded into POS cart" });
    } else {
      toast({
        variant: "destructive",
        title: "OCR draft could not map to products",
      });
    }
    clearOcrDraft("sale");
  }, [products, toast]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.isActive &&
          p.stockQuantity > 0 &&
          (search === "" ||
            p.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [products, search],
  );

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = subtotal - discount;
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast({ variant: "destructive", title: "Insufficient stock" });
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
          stock: product.stockQuantity,
        },
      ];
    });
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(qty, i.stock) }
          : i,
      ),
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Cart is empty" });
      return;
    }
    if (paymentMethod !== "PAYSTACK" && paid <= 0) {
      toast({ variant: "destructive", title: "Enter amount paid" });
      return;
    }
    if (paymentMethod === "PAYSTACK" && buyerPhone.trim().length < 9) {
      toast({ variant: "destructive", title: "Enter buyer phone number" });
      return;
    }
    createSale.mutate(
      {
        data: {
          items: cart.map((i) => ({
            product_id: i.productId,
            product_name: i.name,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            total: i.quantity * i.unitPrice,
          })),
          customer_id: customerId !== "walkin" ? Number(customerId) : undefined,
          discount_value: discount,
          tax_amount: 0,
          total,
          amount_paid: paymentMethod === "PAYSTACK" ? 0 : paid,
          payment_method: paymentMethod,
        },
      },
      {
        onSuccess: async (sale) => {
          if (paymentMethod === "PAYSTACK") {
            try {
              const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
              const response = await fetch(`${apiUrl}/api/payments/initiate`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("pajoy_token") ?? ""}`,
                },
                body: JSON.stringify({
                  saleId: sale.id,
                  customerId: customerId !== "walkin" ? Number(customerId) : null,
                  amount: total,
                  currency: "KES",
                  phone: buyerPhone,
                  email: "customer@pajoy.co.ke",
                }),
              });
              const payment = await response.json();
              if (!response.ok) {
                throw new Error(payment?.message || payment?.error || "Could not start Paystack payment");
              }
              toast({
                title: "Paystack payment started",
                description: payment.authorizationUrl
                  ? "Opening Paystack checkout for mobile money."
                  : "Payment request sent.",
              });
              if (payment.authorizationUrl) {
                window.open(payment.authorizationUrl, "_blank", "noopener,noreferrer");
              }
            } catch (error) {
              toast({
                variant: "destructive",
                title: "Paystack payment failed",
                description: error instanceof Error ? error.message : "Could not start payment",
              });
            }
          }
          toast({
            title: "Sale recorded!",
            description: `${sale.saleNumber} — ${fmt(sale.total)}`,
          });
          setCart([]);
          setAmountPaid("");
          setBuyerPhone("");
          setDiscount(0);
          setCustomerId("walkin");
          queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["sync/status"] });
        },
        onError: () =>
          toast({ variant: "destructive", title: "Failed to record sale" }),
      },
    );
  };

  return (
    <div className="pos-shell">
      {/* Products Grid */}
      <div className="pos-workspace">
        <div className="pos-title-row">
          <div>
            <h1 className="pos-title">Point of Sale</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fast checkout for PAJOY shop sales
            </p>
          </div>
          <div className="pos-kpi-pill">
            <ShoppingCart className="w-4 h-4" />
            {cart.length} in cart
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pos-search pl-9"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <div className="pos-product-grid">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="pos-product-card"
              data-testid={`product-card-${p.id}`}
            >
              <div className="pos-product-name">{p.name}</div>
              <div className="pos-product-meta">
                {p.size && `${p.size} · `}Stock: {p.stockQuantity}
              </div>
              <div className="pos-product-price">
                {fmt(p.sellingPrice)}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="pos-empty-state">
              No products found
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="pos-cart-panel">
        <div className="pos-cart-header">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Cart</h2>
          </div>
          <Badge variant="secondary">{cart.length} items</Badge>
        </div>

        <div className="pos-cart-list">
          {cart.length === 0 ? (
            <div className="pos-empty-state min-h-40 text-sm">
              Add products to the cart
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="pos-cart-item"
                data-testid={`cart-item-${item.productId}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-primary font-semibold">
                    {fmt(item.unitPrice)}
                  </div>
                </div>
                <div className="pos-cart-controls">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() =>
                      setCart((c) =>
                        c.filter((i) => i.productId !== item.productId),
                      )
                    }
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pos-summary-box">
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="text-sm" data-testid="select-customer">
              <SelectValue placeholder="Walk-in Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walkin">Walk-in Customer</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground flex-1">Discount (KSh)</span>
            <Input
              type="number"
              min="0"
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-24 h-7 text-sm"
              data-testid="input-discount"
            />
          </div>

          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger
              className="text-sm"
              data-testid="select-payment-method"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {paymentMethod === "PAYSTACK" && (
            <div>
              <label className="text-sm text-muted-foreground">
                Buyer Phone for STK / mobile money
              </label>
              <Input
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="mt-1"
                placeholder="2547XXXXXXXX"
                data-testid="input-buyer-phone"
              />
            </div>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span>
                <span>-{fmt(discount)}</span>
              </div>
            )}
            <div className="pos-total-row flex justify-between text-base">
              <span>TOTAL</span>
              <span data-testid="text-total">{fmt(total)}</span>
            </div>
          </div>

          {paymentMethod !== "PAYSTACK" && (
          <div>
            <label className="text-sm text-muted-foreground">
              Amount Paid (KSh)
            </label>
            <Input
              type="number"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="mt-1"
              placeholder="0"
              data-testid="input-amount-paid"
            />
          </div>
          )}

          {paid > 0 && (
            <div className="flex justify-between text-sm font-semibold text-emerald-600">
              <span>Change</span>
              <span data-testid="text-change">{fmt(change)}</span>
            </div>
          )}

          <Button
            className="pos-checkout w-full"
            onClick={handleCheckout}
            disabled={createSale.isPending || cart.length === 0}
            data-testid="button-checkout"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {createSale.isPending ? "Processing..." : "Complete Sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
