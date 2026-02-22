"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/api-client";

import type { ReviewRow } from "./reviews-types";

type Props = {
  orgId: string;
  initialReviews: ReviewRow[];
  locale: string;
};

export function ReviewsManager({ orgId, initialReviews, locale }: Props) {
  const isEn = locale === "en-US";
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const refresh = useCallback(
    async (status = statusFilter) => {
      try {
        const res = await authedFetch<{ data: ReviewRow[] }>(
          `/reviews?org_id=${orgId}&response_status=${status}&limit=50`
        );
        setReviews(res.data ?? []);
      } catch {
        // keep existing
      }
    },
    [orgId, statusFilter]
  );

  const handleFilterChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      refresh(status);
    },
    [refresh]
  );

  const handleAcceptSuggestion = useCallback(
    async (review: ReviewRow) => {
      if (!review.ai_suggested_response) return;
      setUpdating(review.id);
      try {
        await authedFetch(`/reviews/${review.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            org_id: orgId,
            response_text: review.ai_suggested_response,
            response_status: "draft",
          }),
        });
        setReviews((prev) =>
          prev.map((r) =>
            r.id === review.id
              ? {
                  ...r,
                  response_text: review.ai_suggested_response,
                  response_status: "draft",
                }
              : r
          )
        );
      } catch {
        toast.error("Failed to accept suggestion");
      } finally {
        setUpdating(null);
      }
    },
    [orgId]
  );

  const handlePublish = useCallback(
    async (reviewId: string) => {
      setUpdating(reviewId);
      try {
        await authedFetch(`/reviews/${reviewId}/publish-response`, {
          method: "POST",
          body: JSON.stringify({ org_id: orgId }),
        });
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, response_status: "published" } : r
          )
        );
      } catch {
        toast.error("Failed to publish response");
      } finally {
        setUpdating(null);
      }
    },
    [orgId]
  );

  const handleSaveCustomResponse = useCallback(
    async (reviewId: string) => {
      if (!responseText.trim()) return;
      setUpdating(reviewId);
      try {
        await authedFetch(`/reviews/${reviewId}`, {
          method: "PATCH",
          body: JSON.stringify({
            org_id: orgId,
            response_text: responseText.trim(),
            response_status: "draft",
          }),
        });
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  response_text: responseText.trim(),
                  response_status: "draft",
                }
              : r
          )
        );
        setEditingResponse(null);
        setResponseText("");
      } catch {
        toast.error("Failed to save response");
      } finally {
        setUpdating(null);
      }
    },
    [orgId, responseText]
  );

  const handleSkip = useCallback(
    async (reviewId: string) => {
      setUpdating(reviewId);
      try {
        await authedFetch(`/reviews/${reviewId}`, {
          method: "PATCH",
          body: JSON.stringify({
            org_id: orgId,
            response_status: "skipped",
          }),
        });
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } catch {
        toast.error("Failed to skip review");
      } finally {
        setUpdating(null);
      }
    },
    [orgId]
  );

  const renderStars = (rating?: number | null) => {
    if (rating == null) return "—";
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  const ratingColor = (rating?: number | null) => {
    if (rating == null) return "text-muted-foreground";
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["pending", "draft", "published", "skipped"] as const).map((s) => (
          <Button
            key={s}
            onClick={() => handleFilterChange(s)}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
          >
            {s === "pending"
              ? isEn
                ? "Pending"
                : "Pendiente"
              : s === "draft"
                ? isEn
                  ? "Drafts"
                  : "Borradores"
                : s === "published"
                  ? isEn
                    ? "Published"
                    : "Publicados"
                  : isEn
                    ? "Skipped"
                    : "Omitidos"}
          </Button>
        ))}
      </div>

      {reviews.length === 0 && (
        <p className="py-4 text-muted-foreground text-sm">
          {isEn
            ? "No reviews in this status."
            : "No hay reseñas en este estado."}
        </p>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div className="space-y-3 rounded-lg border p-4" key={review.id}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">
                    {review.guest_name || (isEn ? "Anonymous" : "Anónimo")}
                  </span>
                  <Badge className="text-[10px]" variant="outline">
                    {review.platform}
                  </Badge>
                  <span className={`text-sm ${ratingColor(review.rating)}`}>
                    {renderStars(review.rating)}
                  </span>
                </div>
                {review.property_name && (
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {review.property_name}
                  </p>
                )}
              </div>
              {review.review_date && (
                <span className="shrink-0 text-muted-foreground text-xs">
                  {new Date(review.review_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Review text */}
            {review.review_text && (
              <p className="text-sm leading-relaxed">{review.review_text}</p>
            )}

            {/* AI Suggestion */}
            {review.ai_suggested_response &&
              review.response_status === "pending" && (
                <div className="space-y-2 rounded-md bg-muted/50 p-3">
                  <p className="font-medium text-muted-foreground text-xs">
                    {isEn
                      ? "AI Suggested Response"
                      : "Respuesta Sugerida por IA"}
                  </p>
                  <p className="text-sm leading-relaxed">
                    {review.ai_suggested_response}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      disabled={updating === review.id}
                      onClick={() => handleAcceptSuggestion(review)}
                      size="sm"
                    >
                      {isEn ? "Use this" : "Usar esta"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingResponse(review.id);
                        setResponseText(review.ai_suggested_response ?? "");
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      {isEn ? "Edit" : "Editar"}
                    </Button>
                  </div>
                </div>
              )}

            {/* Draft response */}
            {review.response_text && review.response_status === "draft" && (
              <div className="space-y-2 rounded-md bg-green-50 p-3 dark:bg-green-950/20">
                <p className="font-medium text-green-700 text-xs dark:text-green-400">
                  {isEn ? "Draft Response" : "Borrador de Respuesta"}
                </p>
                <p className="text-sm leading-relaxed">
                  {review.response_text}
                </p>
                <Button
                  disabled={updating === review.id}
                  onClick={() => handlePublish(review.id)}
                  size="sm"
                >
                  {isEn ? "Publish" : "Publicar"}
                </Button>
              </div>
            )}

            {/* Custom response editor */}
            {editingResponse === review.id && (
              <div className="space-y-2">
                <textarea
                  className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={
                    isEn ? "Write your response..." : "Escribe tu respuesta..."
                  }
                  rows={4}
                  value={responseText}
                />
                <div className="flex gap-1">
                  <Button
                    disabled={updating === review.id || !responseText.trim()}
                    onClick={() => handleSaveCustomResponse(review.id)}
                    size="sm"
                  >
                    {isEn ? "Save Draft" : "Guardar Borrador"}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingResponse(null);
                      setResponseText("");
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {isEn ? "Cancel" : "Cancelar"}
                  </Button>
                </div>
              </div>
            )}

            {/* Actions for pending reviews without AI suggestion */}
            {review.response_status === "pending" &&
              !review.ai_suggested_response &&
              editingResponse !== review.id && (
                <div className="flex gap-1">
                  <Button
                    onClick={() => {
                      setEditingResponse(review.id);
                      setResponseText("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {isEn ? "Write Response" : "Escribir Respuesta"}
                  </Button>
                  <Button
                    disabled={updating === review.id}
                    onClick={() => handleSkip(review.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {isEn ? "Skip" : "Omitir"}
                  </Button>
                </div>
              )}

            {/* Skip action for pending with suggestion */}
            {review.response_status === "pending" &&
              review.ai_suggested_response &&
              editingResponse !== review.id && (
                <div className="flex justify-end">
                  <Button
                    disabled={updating === review.id}
                    onClick={() => handleSkip(review.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {isEn ? "Skip" : "Omitir"}
                  </Button>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
