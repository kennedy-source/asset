import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListProducts, useCreateSale, useListCustomers } from "@workspace/api-client-react";
import type { Product, SaleItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import {
  Search, Scan, Trash2, Plus, Minus, ShoppingCart,
  CreditCard, Smartphone, Banknote, X, CheckCircle,
  Printer, ArrowLeft, User, ZapIcon
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount: number;
}

type PaymentMethod = "cash" | "mpesa" | "card";

const VAT_RATE = 0.16;

export default function POS() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>("");
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const { data: productsData, isLoading: productsLoading } = useListProducts({ limit: 200, is_active: true });
  const { data: customersData } = useListCustomers({ limit: 100 });
  const createSale = useCreateSale();

  const products = productsData?.data ?? [];
  const customers = customersData?.data ?? [];

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.category_name) cats.add(p.category_name); });
    return ["all", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    let list = products;
    if (selectedCategory !== "all") {
      list = list.filter(p => p.category_name === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, search, selectedCategory]);

  const addToCart = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      toast({ title: "Out of stock", description: `${product.name} is not available`, variant: "destructive" });
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast({ title: "Max stock reached", description: `Only ${product.stock_quantity} available`, variant: "destructive" });
          return prev;
        }
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, unit_price: product.price, discount: 0 }];
    });
  }, [toast]);

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev =>
      prev.flatMap(i => {
        if (i.product.id !== productId) return [i];
        const newQty = i.quantity + delta;
        if (newQty <= 0) return [];
        if (newQty > i.product.stock_quantity) {
          toast({ title: "Max stock reached", description: `Only ${i.product.stock_quantity} available`, variant: "destructive" });
          return [i];
        }
        return [{ ...i, quantity: newQty }];
      })
    );
  };

  const updateDiscount = (productId: number, discount: number) => {
    setCart(prev => prev.map(i =>
      i.product.id === productId ? { ...i, discount: Math.max(0, Math.min(discount, 100)) } : i
    ));
  };

  const subtotal = cart.reduce((sum, item) => {
    const lineTotal = item.unit_price * item.quantity * (1 - item.discount / 100);
    return sum + lineTotal;
  }, 0);

  const taxAmount = subtotal * VAT_RATE;
  const total = subtotal + taxAmount;
  const change = parseFloat(amountPaid) - total;

  const clearCart = () => {
    setCart([]);
    setCustomerId("");
    setAmountPaid("");
    setPaymentMethod("cash");
  };

  const handlePay = async () => {
    if (cart.length === 0) return;
    const paid = parseFloat(amountPaid) || 0;
    if (paymentMethod === "cash" && paid < total) {
      toast({ title: "Insufficient payment", description: "Amount paid is less than the total", variant: "destructive" });
      return;
    }

    const items: SaleItem[] = cart.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.product.cost_price ?? undefined,
      discount: item.discount,
      total: item.unit_price * item.quantity * (1 - item.discount / 100),
    }));

    try {
      const sale = await createSale.mutateAsync({
        data: {
          customer_id: customerId ? parseInt(customerId) : null,
          items,
          tax_amount: taxAmount,
          payment_method: paymentMethod,
          amount_paid: paymentMethod === "cash" ? paid : total,
          total,
        }
      });
      setLastSale(sale);
      setShowPayDialog(false);
      setShowReceipt(true);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: "Sale completed!", description: `Receipt #${sale.sale_number}` });
    } catch (err: any) {
      toast({ title: "Sale failed", description: err?.message || "Please try again", variant: "destructive" });
    }
  };

  const handleNewSale = () => {
    clearCart();
    setShowReceipt(false);
    setLastSale(null);
    searchRef.current?.focus();
  };

  useEffect(() => {
    if (showPayDialog && paymentMethod !== "cash") {
      setAmountPaid(total.toFixed(2));
    }
  }, [paymentMethod, showPayDialog, total]);

  const processBarcodeInput = useCallback((barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    const product = products.find(p =>
      p.barcode === trimmed || p.sku === trimmed
    );

    if (product) {
      addToCart(product);
      setScanFeedback(`✓ ${product.name}`);
      setTimeout(() => setScanFeedback(null), 2000);
    } else {
      setScanFeedback(`No product found: ${trimmed}`);
      setTimeout(() => setScanFeedback(null), 2500);
      toast({ title: "Product not found", description: `Barcode: ${trimmed}`, variant: "destructive" });
    }
  }, [products, addToCart, toast]);

  useEffect(() => {
    if (!barcodeMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        const barcode = barcodeBufferRef.current;
        barcodeBufferRef.current = "";
        if (barcode.length >= 3) {
          processBarcodeInput(barcode);
        }
      } else if (e.key.length === 1) {
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeBufferRef.current += e.key;
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
    };
  }, [barcodeMode, processBarcodeInput]);

  if (showReceipt && lastSale) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-muted/30 p-4">
        <div className="bg-card border rounded-2xl shadow-lg w-full max-w-sm p-6 space-y-4">
          <div className="text-center">
            <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-2" />
            <h2 className="text-xl font-bold">Sale Complete</h2>
            <p className="text-muted-foreground text-sm">Receipt #{lastSale.sale_number}</p>
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Date</span>
              <span>{new Date(lastSale.created_at).toLocaleString("en-KE")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Cashier</span>
              <span>{user?.name}</span>
            </div>
            {lastSale.customer_name && (
              <div className="flex justify-between text-muted-foreground">
                <span>Customer</span>
                <span>{lastSale.customer_name}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            {lastSale.items?.map((item: SaleItem, i: number) => (
              <div key={i} className="flex justify-between">
                <span>{item.product_name} × {item.quantity}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(lastSale.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (16%)</span>
              <span>{formatCurrency(lastSale.tax_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span>{formatCurrency(lastSale.total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="capitalize">{lastSale.payment_method}</span>
              <span>{formatCurrency(lastSale.amount_paid ?? lastSale.total)}</span>
            </div>
            {(lastSale.change_given ?? 0) > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Change</span>
                <span>{formatCurrency(lastSale.change_given)}</span>
              </div>
            )}
          </div>

          <Separator />
          <p className="text-center text-xs text-muted-foreground">Thank you for shopping at PAJOY!</p>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button className="flex-1 gap-2" onClick={handleNewSale}>
              <ArrowLeft className="h-4 w-4" /> New Sale
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <header className="h-14 border-b bg-card flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-lg text-primary">PAJOY POS</h1>
          <Badge variant="outline" className="text-xs hidden sm:inline-flex">{user?.name}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {scanFeedback && (
            <div className={`text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 ${scanFeedback.startsWith("✓") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              <Scan className="h-3 w-3" />
              {scanFeedback}
            </div>
          )}
          <Button
            variant={barcodeMode ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setBarcodeMode(m => !m)}
            title="Toggle barcode scanner mode (USB/Bluetooth scanner)"
          >
            <Scan className="h-4 w-4" />
            <span className="hidden sm:inline">Scanner {barcodeMode ? "ON" : "OFF"}</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r">
          <div className="p-3 border-b bg-muted/20 flex-shrink-0 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder={barcodeMode ? "Barcode scanner active — scan or type to search" : "Search products by name, SKU or barcode..."}
                  className="pl-9 h-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat === "all" ? "All Products" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="border rounded-xl p-4 animate-pulse bg-muted/40 h-36" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {search ? `No products matching "${search}"` : "No products available"}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock_quantity <= 0}
                    className={`group border rounded-xl p-3 flex flex-col items-start text-left transition-all hover:shadow-md active:scale-95 ${
                      product.stock_quantity <= 0
                        ? "opacity-50 cursor-not-allowed bg-muted/30"
                        : "hover:border-primary/50 hover:bg-primary/5 bg-card"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                      {product.stock_quantity <= (product.low_stock_threshold ?? 5) && product.stock_quantity > 0 && (
                        <span className="text-xs text-amber-600 font-medium">Low</span>
                      )}
                      {product.stock_quantity <= 0 && (
                        <span className="text-xs text-destructive font-medium">Out</span>
                      )}
                    </div>
                    <span className="text-sm font-semibold leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {product.name}
                    </span>
                    {product.category_name && (
                      <span className="text-xs text-muted-foreground mb-2">{product.category_name}</span>
                    )}
                    <div className="mt-auto w-full flex items-end justify-between">
                      <span className="text-primary font-bold">{formatCurrency(product.price)}</span>
                      <span className="text-xs text-muted-foreground">Qty: {product.stock_quantity}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-80 xl:w-96 flex flex-col bg-card flex-shrink-0">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Current Sale</span>
              {cart.length > 0 && (
                <Badge variant="secondary" className="text-xs">{cart.reduce((s, i) => s + i.quantity, 0)} items</Badge>
              )}
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={clearCart}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Clear</span>
              </Button>
            )}
          </div>

          <div className="px-3 pt-2 border-b pb-2 flex-shrink-0">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-8 text-xs">
                <User className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="Walk-in customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Walk-in customer</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <ShoppingCart className="h-12 w-12 opacity-20" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs text-center px-4">
                  {barcodeMode ? "Scan a barcode or click a product" : "Click a product to add it"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map(item => (
                  <div key={item.product.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)} each</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                          className="px-2 py-1 hover:bg-muted transition-colors"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 py-1 text-sm font-semibold min-w-[2rem] text-center">{item.quantity}</span>
                        <button
                          className="px-2 py-1 hover:bg-muted transition-colors"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="0"
                          value={item.discount || ""}
                          onChange={e => updateDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                          className="h-7 w-14 text-xs text-center px-1"
                          title="Discount %"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <span className="text-sm font-bold ml-1 text-primary">
                          {formatCurrency(item.unit_price * item.quantity * (1 - item.discount / 100))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t p-3 space-y-2 flex-shrink-0 bg-card">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT (16%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              className="w-full h-11 text-base font-semibold gap-2"
              disabled={cart.length === 0 || createSale.isPending}
              onClick={() => setShowPayDialog(true)}
            >
              <ZapIcon className="h-4 w-4" />
              {createSale.isPending ? "Processing..." : "Pay Now"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "mpesa", "card"] as PaymentMethod[]).map(method => {
                const icons = { cash: Banknote, mpesa: Smartphone, card: CreditCard };
                const labels = { cash: "Cash", mpesa: "M-Pesa", card: "Card" };
                const Icon = icons[method];
                return (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === method
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{labels[method]}</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT (16%)</span><span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-primary">
                <span>Amount Due</span><span>{formatCurrency(total)}</span>
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount Tendered (KSh)</label>
                <Input
                  type="number"
                  step="0.01"
                  min={total}
                  placeholder={total.toFixed(2)}
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="text-lg font-bold h-12"
                  autoFocus
                />
                {parseFloat(amountPaid) >= total && (
                  <div className="flex justify-between items-center px-3 py-2 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-700">Change</span>
                    <span className="text-lg font-bold text-green-700">{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "mpesa" && (
              <div className="p-4 bg-green-50 rounded-xl text-center space-y-1">
                <Smartphone className="mx-auto h-8 w-8 text-green-600" />
                <p className="font-semibold text-green-800">Request M-Pesa Payment</p>
                <p className="text-sm text-green-700">Ask customer to send <strong>{formatCurrency(total)}</strong> via M-Pesa</p>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="p-4 bg-blue-50 rounded-xl text-center space-y-1">
                <CreditCard className="mx-auto h-8 w-8 text-blue-600" />
                <p className="font-semibold text-blue-800">Card Payment</p>
                <p className="text-sm text-blue-700">Swipe or tap card for <strong>{formatCurrency(total)}</strong></p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancel</Button>
            <Button
              className="flex-1 gap-2"
              onClick={handlePay}
              disabled={
                createSale.isPending ||
                (paymentMethod === "cash" && (parseFloat(amountPaid) < total || !amountPaid))
              }
            >
              <CheckCircle className="h-4 w-4" />
              {createSale.isPending ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
