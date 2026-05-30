const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('artifacts');
const patches = [
  {
    file: path.join(root, 'api-server/src/services/paystack.ts'),
    old: '  const reference = normalizeReference(input.reference);\n  const currency = (input.currency ?? "NGN").toUpperCase();\n  const email = input.email ?? "no-reply@example.com";\n\n  if (!input.amount || input.amount <= 0) {',
    new: '  const reference = normalizeReference(input.reference);\n  const currency = (input.currency ?? "NGN").toUpperCase();\n  if (!input.email || !/\\S+@\\S+\\.\\S+/.test(input.email)) {\n    throw new AppError(\n      400,\n      "VALIDATION_ERROR",\n      "A valid customer email address is required for Paystack payment initialization.",\n    );\n  }\n  const email = input.email;\n\n  if (!input.amount || input.amount <= 0) {',
  },
  {
    file: path.join(root, 'pajoy/src/main.tsx'),
    old: 'setBaseUrl(import.meta.env.VITE_API_URL || "http://localhost:8080");',
    new: 'setBaseUrl(import.meta.env.VITE_API_URL ?? window.location.origin);',
  },
  {
    file: path.join(root, 'pajoy/src/desktop-api.ts'),
    old: '  const apiUrl =\n    import.meta.env.VITE_API_URL ??\n    (import.meta.env.DEV ? "http://localhost:8080" : "");\n  const url = normalized.url.startsWith("http")\n    ? normalized.url\n    : `${apiUrl}${normalized.url}`;',
    new: '  const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;\n  const url = normalized.url.startsWith("http")\n    ? normalized.url\n    : `${apiUrl}${normalized.url.startsWith("/") ? "" : "/"}${normalized.url}`;',
  },
  {
    file: path.join(root, 'pajoy/src/pages/categories.tsx'),
    old: 'const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";',
    new: 'const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;',
  },
  {
    file: path.join(root, 'pajoy/src/pages/audit-logs.tsx'),
    old: '      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";',
    new: '      const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;',
  },
  {
    file: path.join(root, 'pajoy/src/pages/pos.tsx'),
    old: '  const [buyerPhone, setBuyerPhone] = useState("");\n  const [discount, setDiscount] = useState(0);',
    new: '  const [buyerPhone, setBuyerPhone] = useState("");\n  const [buyerEmail, setBuyerEmail] = useState("");\n  const [discount, setDiscount] = useState(0);',
  },
  {
    file: path.join(root, 'pajoy/src/pages/pos.tsx'),
    old: '  const handleCheckout = () => {\n    if (cart.length === 0) {\n      toast({ variant: "destructive", title: "Cart is empty" });\n      return;\n    }\n    if (paymentMethod !== "PAYSTACK" && paid <= 0) {\n      toast({ variant: "destructive", title: "Enter amount paid" });\n      return;\n    }\n    if (paymentMethod === "PAYSTACK" && buyerPhone.trim().length < 9) {\n      toast({ variant: "destructive", title: "Enter buyer phone number" });\n      return;\n    }',
    new: '  const selectedCustomer = customers.find((c) => String(c.id) === customerId);\n  const paymentEmail = selectedCustomer?.email || buyerEmail;\n\n  const handleCheckout = () => {\n    if (cart.length === 0) {\n      toast({ variant: "destructive", title: "Cart is empty" });\n      return;\n    }\n    if (paymentMethod !== "PAYSTACK" && paid <= 0) {\n      toast({ variant: "destructive", title: "Enter amount paid" });\n      return;\n    }\n    if (paymentMethod === "PAYSTACK" && buyerPhone.trim().length < 9) {\n      toast({ variant: "destructive", title: "Enter buyer phone number" });\n      return;\n    }\n    if (paymentMethod === "PAYSTACK" && !/\\S+@\\S+\\.\\S+/.test(paymentEmail)) {\n      toast({ variant: "destructive", title: "Enter a valid buyer email for Paystack payments" });\n      return;\n    }',
  },
  {
    file: path.join(root, 'pajoy/src/pages/pos.tsx'),
    old: '                  phone: buyerPhone,\n                  email: "customer@pajoy.co.ke",\n                }),',
    new: '                  phone: buyerPhone,\n                  email: paymentEmail,\n                }),',
  },
  {
    file: path.join(root, 'pajoy/src/pages/pos.tsx'),
    old: '          {paymentMethod === "PAYSTACK" && (\n            <div>\n              <label className="text-sm text-muted-foreground">\n                Buyer Phone for STK / mobile money\n              </label>\n              <Input\n                value={buyerPhone}\n                onChange={(e) => setBuyerPhone(e.target.value)}\n                className="mt-1"\n                placeholder="2547XXXXXXXX"\n                data-testid="input-buyer-phone"\n              />\n            </div>\n          )}',
    new: '          {paymentMethod === "PAYSTACK" && (\n            <div className="space-y-4">\n              <div>\n                <label className="text-sm text-muted-foreground">\n                  Buyer Phone for STK / mobile money\n                </label>\n                <Input\n                  value={buyerPhone}\n                  onChange={(e) => setBuyerPhone(e.target.value)}\n                  className="mt-1"\n                  placeholder="2547XXXXXXXX"\n                  data-testid="input-buyer-phone"\n                />\n              </div>\n              <div>\n                <label className="text-sm text-muted-foreground">\n                  Buyer Email for Paystack receipt\n                </label>\n                <Input\n                  value={buyerEmail}\n                  onChange={(e) => setBuyerEmail(e.target.value)}\n                  className="mt-1"\n                  placeholder="customer@example.com"\n                  data-testid="input-buyer-email"\n                />\n                {selectedCustomer?.email && (\n                  <p className="text-xs text-muted-foreground mt-1">\n                    Using selected customer email: {selectedCustomer.email}\n                  </p>\n                )}\n              </div>\n            </div>\n          )}',
  },
  {
    file: path.join(root, 'pajoy/src/pages/pos.tsx'),
    old: '              const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";\n              const response = await fetch(`${apiUrl}/api/payments/initiate`, {',
    new: '              const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;\n              const response = await fetch(`${apiUrl}/api/payments/initiate`, {',
  },
];

const paymentStatusPath = path.join(root, 'pajoy/src/pages/payment-status.tsx');
const paymentStatusContent = `// @ts-nocheck
import { useState, useEffect } from "react";
import { desktopApiJson } from "@/desktop-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PaymentVerifyResult = {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  gatewayResponse?: string;
  channel?: string;
};

export default function PaymentStatus({ trackingId }: { trackingId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await desktopApiJson('/api/payments/verify/' + trackingId);
      setResult({
        reference: response.data.reference ?? trackingId,
        amount: Number(response.data.amount ?? 0) / 100,
        currency: String(response.data.currency ?? "KES").toUpperCase(),
        status: String(response.data.status ?? "UNKNOWN").toUpperCase(),
        gatewayResponse: response.data.gateway_response,
        channel: response.data.channel,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verify();
  }, [trackingId]);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Payment Status</h1>
      <Card>
        <CardHeader>
          <CardTitle>Transaction Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-mono text-sm">{trackingId}</p>
          <Button onClick={verify} disabled={loading}>
            {loading ? "Verifying..." : "Refresh Verification"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              Merchant Ref: <span className="font-mono">{result.reference}</span>
            </p>
            <p className="text-sm">Status: <Badge>{result.status}</Badge></p>
            <p className="text-sm">Amount: {result.currency} {result.amount.toFixed(2)}</p>
            {result.channel && <p className="text-sm">Channel: {result.channel}</p>}
            {result.gatewayResponse && <p className="text-sm">Gateway response: {result.gatewayResponse}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
`;

patches.push({ file: paymentStatusPath, old: fs.readFileSync(paymentStatusPath, 'utf8'), new: paymentStatusContent });

for (const patch of patches) {
  const filePath = patch.file;
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(patch.old)) {
    console.error(`⚠️ Old snippet not found in ${filePath}`);
    continue;
  }
  fs.writeFileSync(filePath, content.replace(patch.old, patch.new), 'utf8');
  console.log(`Patched ${filePath}`);
}
