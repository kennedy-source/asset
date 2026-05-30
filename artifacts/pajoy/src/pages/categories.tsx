// @ts-nocheck
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getValidSessionToken } from "@/lib/auth";
import { Boxes, Layers3, PackagePlus, Palette, Plus, Ruler, Search, Shirt, Tag } from "lucide-react";

const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;

async function apiJson(path: string, init?: RequestInit) {
  const token = getValidSessionToken();
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const blankForm = {
  name: "",
  description: "",
  kind: "category",
  parentId: "",
};

export default function Categories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankForm);

  const hierarchyQuery = useQuery({
    queryKey: ["categories-hierarchy"],
    queryFn: () => apiJson("/api/categories/hierarchy"),
  });
  const metaQuery = useQuery({
    queryKey: ["inventory-meta"],
    queryFn: () => apiJson("/api/categories/meta"),
  });

  const categories = hierarchyQuery.data?.items ?? [];
  const meta = metaQuery.data ?? {};

  const filteredCategories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories
      .map((category: any) => ({
        ...category,
        subcategories: (category.subcategories ?? []).filter(
          (sub: any) =>
            sub.name.toLowerCase().includes(needle) ||
            (sub.productTypes ?? []).some((type: any) => type.name.toLowerCase().includes(needle)),
        ),
        productTypes: (category.productTypes ?? []).filter((type: any) => type.name.toLowerCase().includes(needle)),
      }))
      .filter(
        (category: any) =>
          category.name.toLowerCase().includes(needle) ||
          category.subcategories.length > 0 ||
          category.productTypes.length > 0,
      );
  }, [categories, query]);

  const topCategories = categories.filter((category: any) => category.kind === "category");
  const totals = {
    categories: categories.length,
    subcategories: categories.reduce((sum: number, category: any) => sum + (category.subcategories?.length ?? 0), 0),
    productTypes: categories.reduce(
      (sum: number, category: any) =>
        sum +
        (category.productTypes?.length ?? 0) +
        (category.subcategories ?? []).reduce((inner: number, sub: any) => inner + (sub.productTypes?.length ?? 0), 0),
      0,
    ),
  };

  const openCreate = (kind = "category", parentId = "") => {
    setForm({ ...blankForm, kind, parentId: parentId ? String(parentId) : "" });
    setOpen(true);
  };

  const saveCategory = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    await apiJson("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        kind: form.kind,
        parent_id: form.parentId ? Number(form.parentId) : null,
      }),
    });
    toast({ title: "Category saved" });
    setOpen(false);
    setForm(blankForm);
    queryClient.invalidateQueries({ queryKey: ["categories-hierarchy"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Category & Inventory Structure</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage categories, subcategories, product types, variants, sizes, colors, materials, brands, and tags.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate("subcategory")}>
            <Layers3 className="w-4 h-4 mr-2" />
            Add Subcategory
          </Button>
          <Button onClick={() => openCreate("category")} data-testid="button-add-category">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat icon={Boxes} label="Main Categories" value={totals.categories} />
        <Stat icon={Layers3} label="Subcategories" value={totals.subcategories} />
        <Stat icon={PackagePlus} label="Product Types" value={totals.productTypes} />
        <Stat icon={Shirt} label="Inventory Attributes" value={(meta.sizes?.length ?? 0) + (meta.colors?.length ?? 0) + (meta.materials?.length ?? 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search categories, subcategories, or product types"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {hierarchyQuery.isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading category structure...</div>
          ) : (
            <div className="space-y-3">
              {filteredCategories.map((category: any) => (
                <div key={category.id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-lg">{category.name}</h2>
                        <Badge variant="secondary">Category</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{category.description || "No description"}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openCreate("subcategory", category.id)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Subcategory
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {(category.subcategories ?? []).map((sub: any) => (
                      <div key={sub.id} className="rounded-md border bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{sub.name}</div>
                            <div className="text-xs text-muted-foreground">Subcategory</div>
                          </div>
                          <Badge variant="outline">{sub.productTypes?.length ?? 0} product types</Badge>
                        </div>
                        <ProductTypeList types={sub.productTypes ?? []} />
                      </div>
                    ))}

                    {(category.productTypes ?? []).length > 0 && (
                      <div className="rounded-md border bg-background p-3">
                        <div className="text-sm font-medium mb-2">Direct Product Types</div>
                        <ProductTypeList types={category.productTypes ?? []} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <AttributePanel title="Sizes" icon={Ruler} items={meta.sizes ?? []} label={(item: any) => `${item.name} (${item.size_type})`} />
          <AttributePanel title="Colors" icon={Palette} items={meta.colors ?? []} label={(item: any) => item.name} color />
          <AttributePanel title="Materials" icon={Shirt} items={meta.materials ?? []} label={(item: any) => item.name} />
          <AttributePanel title="Brands & Tags" icon={Tag} items={[...(meta.brands ?? []), ...((meta.tags ?? []).map((name: string) => ({ name })))]} label={(item: any) => item.name} />
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.kind === "subcategory" ? "New Subcategory" : "New Category"}</DialogTitle>
            <DialogDescription>
              Add a structured inventory node. Product types and variants use this hierarchy for filtering and stock tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(value) => setForm((prev) => ({ ...prev, kind: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="subcategory">Subcategory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind === "subcategory" && (
              <div className="grid gap-2">
                <Label>Parent Category</Label>
                <Select value={form.parentId} onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {topCategories.map((category: any) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={saveCategory}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-sky-100 p-2 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ProductTypeList({ types }: { types: any[] }) {
  if (!types.length) return <div className="mt-3 text-sm text-muted-foreground">No product types yet</div>;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {types.map((type) => (
        <Badge key={type.id} variant="secondary" className="rounded-md">
          {type.name}
        </Badge>
      ))}
    </div>
  );
}

function AttributePanel({ title, icon: Icon, items, label, color = false }: any) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-sky-700" />
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 18).map((item: any, index: number) => (
          <span key={`${item.id ?? item.name}-${index}`} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
            {color && <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: item.hex_code }} />}
            {label(item)}
          </span>
        ))}
      </div>
    </div>
  );
}
