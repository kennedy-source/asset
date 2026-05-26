export type OcrDraftItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type OcrDraft = {
  source: "ocr";
  imageUrl: string;
  extractedText?: string;
  confidence?: number;
  items: OcrDraftItem[];
};

const KEYS = {
  quotation: "ocr_draft_quotation",
  invoice: "ocr_draft_invoice",
  sale: "ocr_draft_sale",
  embroidery: "ocr_draft_embroidery",
  production: "ocr_draft_production",
} as const;

export function saveOcrDraft(target: keyof typeof KEYS, draft: OcrDraft) {
  localStorage.setItem(KEYS[target], JSON.stringify(draft));
}

export function loadOcrDraft(target: keyof typeof KEYS): OcrDraft | null {
  const raw = localStorage.getItem(KEYS[target]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OcrDraft;
  } catch {
    return null;
  }
}

export function clearOcrDraft(target: keyof typeof KEYS) {
  localStorage.removeItem(KEYS[target]);
}
