"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

function asString(v: unknown): string {
  return typeof v === "string" ? v : v ? String(v) : "";
}

type Row = {
  id: string;
  title: string;
  category: string;
  urgency: string;
  status: string;
  created_at: string;
};

export function TenantMaintenance({ locale }: { locale: string }) {
  "use no memo";
  const isEn = locale === "en-US";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tokenState] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tenant_token") : null
  );

  const { data: requests = [], isPending: loading } = useQuery({
    queryKey: ["tenant-maintenance", tokenState],
    queryFn: async () => {
      const token = localStorage.getItem("tenant_token");
      if (!token) {
        router.push("/tenant/login");
        return [];
      }
      const res = await fetch(`${API_BASE}/tenant/maintenance-requests`, {
        headers: { "x-tenant-token": token },
      });
      if (res.status === 401) {
        localStorage.clear();
        router.push("/tenant/login");
        return [];
      }
      if (!res.ok) return [];
      const json = await res.json();
      const rawData = json.data;
      let rows: Record<string, unknown>[] = [];
      if (rawData != null) rows = rawData as Record<string, unknown>[];
      return rows.map(
        (r): Row => ({
          id: asString(r.id),
          title: asString(r.title),
          category: asString(r.category),
          urgency: asString(r.urgency),
          status: asString(r.status),
          created_at: asString(r.created_at).slice(0, 10),
        })
      );
    },
    enabled: Boolean(tokenState),
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("tenant_token");
    if (!token) return;
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API_BASE}/tenant/maintenance-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-token": token,
        },
        body: JSON.stringify({
          title: fd.get("title"),
          category: fd.get("category"),
          urgency: fd.get("urgency"),
          description: fd.get("description"),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        queryClient.invalidateQueries({ queryKey: ["tenant-maintenance"] });
      }
      setSubmitting(false);
    } catch {
      /* ignore */ setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">
          {isEn ? "Loading..." : "Cargando..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">
          {isEn ? "Maintenance Requests" : "Solicitudes de Mantenimiento"}
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(!showForm)} type="button">
            {showForm
              ? isEn
                ? "Cancel"
                : "Cancelar"
              : isEn
                ? "New Request"
                : "Nueva Solicitud"}
          </Button>
          <Link href="/tenant/dashboard">
            <Button size="sm" variant="outline">
              {isEn ? "Back" : "Volver"}
            </Button>
          </Link>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="space-y-1 text-sm">
                <span>{isEn ? "Title" : "Título"} *</span>
                <Input
                  name="title"
                  placeholder={isEn ? "Brief description" : "Descripción breve"}
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>{isEn ? "Category" : "Categoría"}</span>
                  <Select defaultValue="general" name="category">
                    <option value="plumbing">
                      {isEn ? "Plumbing" : "Plomería"}
                    </option>
                    <option value="electrical">
                      {isEn ? "Electrical" : "Eléctrica"}
                    </option>
                    <option value="structural">
                      {isEn ? "Structural" : "Estructural"}
                    </option>
                    <option value="appliance">
                      {isEn ? "Appliance" : "Electrodoméstico"}
                    </option>
                    <option value="pest">
                      {isEn ? "Pest Control" : "Control de Plagas"}
                    </option>
                    <option value="general">
                      {isEn ? "General" : "General"}
                    </option>
                  </Select>
                </label>
                <label className="space-y-1 text-sm">
                  <span>{isEn ? "Urgency" : "Urgencia"}</span>
                  <Select defaultValue="medium" name="urgency">
                    <option value="low">{isEn ? "Low" : "Baja"}</option>
                    <option value="medium">{isEn ? "Medium" : "Media"}</option>
                    <option value="high">{isEn ? "High" : "Alta"}</option>
                    <option value="emergency">
                      {isEn ? "Emergency" : "Emergencia"}
                    </option>
                  </Select>
                </label>
              </div>
              <label className="space-y-1 text-sm">
                <span>{isEn ? "Description" : "Descripción"}</span>
                <Textarea
                  name="description"
                  placeholder={
                    isEn ? "Describe the issue..." : "Describe el problema..."
                  }
                  rows={4}
                />
              </label>
              <Button disabled={submitting} type="submit">
                {submitting
                  ? isEn
                    ? "Submitting..."
                    : "Enviando..."
                  : isEn
                    ? "Submit"
                    : "Enviar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && !showForm ? (
        <p className="text-muted-foreground">
          {isEn ? "No requests yet." : "No hay solicitudes aún."}
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {r.category} · {r.created_at}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={r.urgency} value={r.urgency} />
                  <StatusBadge label={r.status} value={r.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
