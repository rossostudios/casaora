"use client";

import {
  ArrowLeft02Icon,
  Cancel01Icon,
  Clock02Icon,
  Delete01Icon,
  PlusSignIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { ModelSelectorPill } from "@/components/agent/model-selector-pill";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AgentModelOption } from "@/lib/api";

export function ChatHeader({
  chatTitle,
  loading,
  isSending,
  isEn,
  isChatDetailRoute,
  isEmbedded,
  isArchived,
  busy,
  deleteArmed,
  onNewThread,
  onHistoryClick,
  onArchiveToggle,
  onDeleteArm,
  onDeleteConfirm,
  onDeleteCancel,
  onClose,
  selectedModel,
  modelOptions,
  onModelChange,
}: {
  chatTitle?: string;
  loading: boolean;
  isSending: boolean;
  isEn: boolean;
  isChatDetailRoute: boolean;
  isEmbedded: boolean;
  isArchived?: boolean;
  busy: boolean;
  deleteArmed: boolean;
  onNewThread: () => void;
  onHistoryClick: () => void;
  onArchiveToggle: () => void;
  onDeleteArm: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onClose?: () => void;
  selectedModel?: string;
  modelOptions?: AgentModelOption[];
  onModelChange?: (model: string) => void;
}) {
  const showEmbeddedLayout = !!onClose && !isChatDetailRoute;

  if (showEmbeddedLayout) {
    return (
      <div className="sticky top-0 z-10 shrink-0 bg-background">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 sm:px-5">
          {/* Left: close button */}
          <Button
            className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <Icon className="h-3.5 w-3.5" icon={Cancel01Icon} />
            <span className="sr-only">{isEn ? "Close" : "Cerrar"}</span>
          </Button>

          {/* Right: controls */}
          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground"
              disabled={isSending}
              onClick={onNewThread}
              size="icon"
              variant="ghost"
            >
              <Icon className="h-3.5 w-3.5" icon={PlusSignIcon} />
              <span className="sr-only">
                {isEn ? "New thread" : "Nuevo hilo"}
              </span>
            </Button>

            <Button
              className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground"
              onClick={onHistoryClick}
              size="icon"
              variant="ghost"
            >
              <Icon className="h-3.5 w-3.5" icon={Clock02Icon} />
              <span className="sr-only">
                {isEn ? "History" : "Historial"}
              </span>
            </Button>

            {modelOptions && modelOptions.length > 0 && onModelChange ? (
              <ModelSelectorPill
                isEn={isEn}
                modelOptions={modelOptions}
                onModelChange={onModelChange}
                selectedModel={selectedModel ?? ""}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "glass-chrome sticky top-0 z-10 flex shrink-0 items-center justify-between px-4 py-2.5 sm:px-5",
        isEmbedded && "bg-card/95"
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {loading ? (
            <Skeleton className="h-6 w-36 rounded-lg" />
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-casaora-gradient text-white shadow-casaora">
                  <Icon className="h-3 w-3" icon={SparklesIcon} />
                </div>
                <h2 className="truncate font-semibold text-[13.5px] tracking-tight">
                  {chatTitle || (isEn ? "Casaora AI" : "IA Casaora")}
                </h2>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isChatDetailRoute ? null : (
            <>
              <Button
                className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground"
                disabled={isSending}
                onClick={onNewThread}
                size="icon"
                variant="ghost"
              >
                <Icon className="h-3.5 w-3.5" icon={PlusSignIcon} />
                <span className="sr-only">
                  {isEn ? "New thread" : "Nuevo hilo"}
                </span>
              </Button>

              <Button
                className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground"
                onClick={onHistoryClick}
                size="icon"
                variant="ghost"
              >
                <Icon className="h-3.5 w-3.5" icon={Clock02Icon} />
                <span className="sr-only">
                  {isEn ? "History" : "Historial"}
                </span>
              </Button>
            </>
          )}

          {isChatDetailRoute ? (
            <>
              <Button
                className="h-7 gap-1.5 rounded-lg border-border/30 px-2.5 text-[11px]"
                disabled={loading || busy}
                onClick={onArchiveToggle}
                size="sm"
                variant="outline"
              >
                <Icon className="h-3 w-3" icon={ArrowLeft02Icon} />
                {isArchived
                  ? isEn
                    ? "Restore"
                    : "Restaurar"
                  : isEn
                    ? "Archive"
                    : "Archivar"}
              </Button>
              {deleteArmed ? (
                <Button
                  className="h-7 rounded-lg border-border/30 px-2.5 text-[11px]"
                  disabled={loading || busy}
                  onClick={onDeleteCancel}
                  size="sm"
                  variant="outline"
                >
                  {isEn ? "Cancel" : "Cancelar"}
                </Button>
              ) : null}
              <Button
                className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px]"
                disabled={loading || busy}
                onClick={deleteArmed ? onDeleteConfirm : onDeleteArm}
                size="sm"
                variant="destructive"
              >
                <Icon className="h-3 w-3" icon={Delete01Icon} />
                {deleteArmed
                  ? isEn
                    ? "Confirm"
                    : "Confirmar"
                  : isEn
                    ? "Delete"
                    : "Eliminar"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
