// @ts-nocheck
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
