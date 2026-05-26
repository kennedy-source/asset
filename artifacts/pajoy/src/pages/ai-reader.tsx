// @ts-nocheck
import { useState } from "react";
import {
  useCreateAiScan,
  getListAiScansQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Scan, FileSearch, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { saveOcrDraft } from "@/lib/ocr-drafts";

interface ExtractedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

export default function AiReader() {
  const [imageUrl, setImageUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const createScan = useCreateAiScan();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleExtract = async () => {
    if (!imageUrl.trim()) {
      toast({ variant: "destructive", title: "Enter an image URL first" });
      return;
    }
    setScanning(true);
    setSaved(false);
    createScan.mutate(
      { data: { imageUrl } },
      {
        onSuccess: (scan) => {
          const parsed = scan.parsedItemsJson
            ? JSON.parse(scan.parsedItemsJson)
            : [];
          setItems(parsed);
          setConfidence(scan.confidence ?? null);
          setSaved(true);
          queryClient.invalidateQueries({ queryKey: getListAiScansQueryKey() });
          toast({
            title: "Extraction complete",
            description: `${parsed.length} items detected with ${Math.round((scan.confidence ?? 0) * 100)}% confidence`,
          });
        },
        onError: () =>
          toast({ variant: "destructive", title: "Extraction failed" }),
        onSettled: () => setScanning(false),
      },
    );
  };

  const updateItem = (
    i: number,
    field: keyof ExtractedItem,
    value: number | string,
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total =
            (field === "quantity" ? Number(value) : updated.quantity) *
            (field === "unitPrice" ? Number(value) : updated.unitPrice);
        }
        return updated;
      }),
    );
  };

  const handleSave = () => {
    toast({ title: "Already saved during extraction" });
    setSaved(true);
  };

  const handleCreateQuotation = () => {
    saveOcrDraft("quotation", {
      source: "ocr",
      imageUrl,
      confidence: confidence ?? undefined,
      items,
    });
    setLocation("/quotations/new");
  };

  const handleCreateInvoice = () => {
    saveOcrDraft("invoice", {
      source: "ocr",
      imageUrl,
      confidence: confidence ?? undefined,
      items,
    });
    setLocation("/invoices/new");
  };

  const handleCreateSale = () => {
    saveOcrDraft("sale", {
      source: "ocr",
      imageUrl,
      confidence: confidence ?? undefined,
      items,
    });
    setLocation("/pos");
  };

  const handleCreateEmbroidery = () => {
    saveOcrDraft("embroidery", {
      source: "ocr",
      imageUrl,
      confidence: confidence ?? undefined,
      items,
    });
    setLocation("/embroidery/new");
  };

  const handleCreateProduction = () => {
    saveOcrDraft("production", {
      source: "ocr",
      imageUrl,
      confidence: confidence ?? undefined,
      items,
    });
    setLocation("/production");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">AI Book / Image Reader</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload or paste an image URL to extract order items using AI OCR
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Image Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Image URL</label>
            <div className="flex gap-3 mt-1">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/order-book-photo.jpg"
                className="flex-1"
                data-testid="input-image-url"
              />
              <Button
                onClick={handleExtract}
                disabled={scanning}
                data-testid="button-extract"
              >
                {scanning ? (
                  <>
                    <Scan className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <FileSearch className="w-4 h-4 mr-2" />
                    Extract
                  </>
                )}
              </Button>
            </div>
          </div>

          {scanning && (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
              <Scan className="w-12 h-12 mx-auto text-primary animate-spin mb-3" />
              <p className="font-medium">Analyzing image with AI OCR...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Detecting items, quantities, and prices
              </p>
            </div>
          )}

          {!scanning && items.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">
                Enter an image URL and click Extract
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports handwritten order books, printed invoices, and delivery
                notes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Extracted Items</CardTitle>
              {confidence != null && (
                <p className="text-sm text-muted-foreground mt-1">
                  Confidence:{" "}
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {Math.round(confidence * 100)}%
                  </Badge>
                </p>
              )}
            </div>
            {saved && (
              <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Saved
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Item Name</TableHead>
                  <TableHead className="w-24">Quantity</TableHead>
                  <TableHead className="w-32">Unit Price</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i} data-testid={`row-item-${i}`}>
                    <TableCell>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(i, "name", e.target.value)}
                        className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 focus-visible:bg-muted/30 rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(i, "quantity", Number(e.target.value))
                        }
                        className="w-20 text-sm"
                        data-testid={`input-qty-${i}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(i, "unitPrice", Number(e.target.value))
                        }
                        className="w-28 text-sm"
                        data-testid={`input-price-${i}`}
                      />
                    </TableCell>
                    <TableCell
                      className="text-right font-medium"
                      data-testid={`text-total-${i}`}
                    >
                      {fmt(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p
                  className="text-2xl font-bold text-primary"
                  data-testid="text-grand-total"
                >
                  {fmt(total)}
                </p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleCreateQuotation}
                variant="outline"
                data-testid="button-create-quotation"
              >
                Create Quotation
              </Button>
              <Button onClick={handleCreateInvoice} variant="outline">
                Create Invoice
              </Button>
              <Button
                onClick={handleCreateSale}
                variant="outline"
                data-testid="button-create-sale"
              >
                Go to POS
              </Button>
              <Button onClick={handleCreateEmbroidery} variant="outline">
                Embroidery Draft
              </Button>
              <Button onClick={handleCreateProduction} variant="outline">
                Production Draft
              </Button>
              <Button
                onClick={handleSave}
                disabled={createScan.isPending || saved}
                data-testid="button-save-scan"
              >
                {createScan.isPending
                  ? "Saving..."
                  : saved
                    ? "Saved"
                    : "Save Scan Only"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
