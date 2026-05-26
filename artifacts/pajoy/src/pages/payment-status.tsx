// @ts-nocheck
import { useState } from "react";
import { desktopApiJson } from "@/desktop-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VerifyResponse = {
  trackingId: string;
  merchantReference: string;
  statusCode: number;
  statusDescription: string;
  providerMode: "mock" | "live";
};

export default function PaymentStatus({ trackingId }: { trackingId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setLoading(true);
    setError(null);
    // Pesapal verification endpoint removed.
    setError("Verification not available: Pesapal integration removed");
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Payment Status</h1>
      <Card>
        <CardHeader>
          <CardTitle>Tracking ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-mono text-sm">{trackingId}</p>
          <Button onClick={verify} disabled={loading}>
            {loading ? "Verifying..." : "Retry Verification"}
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
              Merchant Ref:{" "}
              <span className="font-mono">{result.merchantReference}</span>
            </p>
            <p className="text-sm">
              Provider Mode:{" "}
              <Badge variant="secondary">{result.providerMode}</Badge>
            </p>
            <p className="text-sm">
              Status: <Badge>{result.statusDescription}</Badge>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
