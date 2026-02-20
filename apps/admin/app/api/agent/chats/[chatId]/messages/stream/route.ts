import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

type RouteParams = {
  params: Promise<{ chatId: string }>;
};

type ChatPayloadMessage = {
  role?: string;
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
};

type StreamMessagePayload = {
  org_id?: string;
  message?: string;
  messages?: ChatPayloadMessage[];
  allow_mutations?: boolean;
  confirm_write?: boolean;
};

type BackendEvent = {
  type?: string;
  message?: string;
  name?: string;
  args?: Record<string, unknown>;
  preview?: string;
  ok?: boolean;
  text?: string;
  content?: string;
  tool_trace?: unknown[];
  model_used?: string | null;
  fallback_used?: boolean;
};

type WriteFlags = {
  allow_mutations?: boolean;
  confirm_write?: boolean;
};

type StreamController = {
  enqueue: (chunk: Uint8Array) => void;
};

function extractUserMessage(payload: StreamMessagePayload): string {
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  if (!Array.isArray(payload.messages)) {
    return "";
  }

  for (let i = payload.messages.length - 1; i >= 0; i -= 1) {
    const row = payload.messages[i];
    if (!row || row.role !== "user") {
      continue;
    }

    if (typeof row.content === "string" && row.content.trim()) {
      return row.content.trim();
    }

    if (!Array.isArray(row.parts)) {
      continue;
    }

    const text = row.parts
      .filter(
        (part) => part && part.type === "text" && typeof part.text === "string"
      )
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n")
      .trim();
    if (text) {
      return text;
    }
  }

  return "";
}

function resolveWriteFlags(payload: StreamMessagePayload): WriteFlags {
  const flags: WriteFlags = {};
  if (typeof payload.allow_mutations === "boolean") {
    flags.allow_mutations = payload.allow_mutations;
  }
  if (typeof payload.confirm_write === "boolean") {
    flags.confirm_write = payload.confirm_write;
  }
  return flags;
}

function emitSsePart(
  controller: StreamController,
  encoder: TextEncoder,
  payload: unknown
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

function emitDone(controller: StreamController, encoder: TextEncoder) {
  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
}

export async function POST(request: Request, { params }: RouteParams) {
  const { chatId } = await params;
  const searchParams = new URL(request.url).searchParams;

  let payload: StreamMessagePayload;
  try {
    payload = (await request.json()) as StreamMessagePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const orgId =
    searchParams.get("org_id")?.trim() ?? payload.org_id?.trim() ?? "";
  const message = extractUserMessage(payload);

  if (!(chatId && orgId && message)) {
    return NextResponse.json(
      { ok: false, error: "chatId, org_id, and message are required." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const writeFlags = resolveWriteFlags(payload);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${API_BASE_URL}/agent/chats/${encodeURIComponent(chatId)}/messages/stream?org_id=${encodeURIComponent(orgId)}`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message,
          ...writeFlags,
        }),
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }

  if (!(backendResponse.ok && backendResponse.body)) {
    const text = await backendResponse.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        error:
          text || backendResponse.statusText || "Streaming request failed.",
      },
      { status: backendResponse.status || 502 }
    );
  }

  const messageId = crypto.randomUUID();
  const textPartId = `text-${messageId}`;
  let started = false;
  let textStarted = false;
  let finished = false;
  let currentText = "";
  let toolCallCounter = 0;
  const pendingToolCalls = new Map<string, string[]>();

  const ensureStart = (controller: StreamController, encoder: TextEncoder) => {
    if (started) {
      return;
    }
    started = true;
    emitSsePart(controller, encoder, {
      type: "start",
      messageId,
    });
  };

  const ensureTextStart = (
    controller: StreamController,
    encoder: TextEncoder
  ) => {
    ensureStart(controller, encoder);
    if (textStarted) {
      return;
    }
    textStarted = true;
    emitSsePart(controller, encoder, {
      type: "text-start",
      id: textPartId,
    });
  };

  const finalize = (
    controller: StreamController,
    encoder: TextEncoder,
    doneContent: string,
    modelUsed: string | null | undefined,
    fallbackUsed: boolean,
    toolTrace: unknown[] | undefined
  ) => {
    if (finished) {
      return;
    }

    ensureTextStart(controller, encoder);

    if (doneContent) {
      if (doneContent.startsWith(currentText)) {
        const delta = doneContent.slice(currentText.length);
        if (delta) {
          emitSsePart(controller, encoder, {
            type: "text-delta",
            id: textPartId,
            delta,
          });
        }
        currentText = doneContent;
      } else {
        emitSsePart(controller, encoder, {
          type: "text-delta",
          id: textPartId,
          delta: doneContent,
        });
        currentText = `${currentText}${doneContent}`;
      }
    }

    emitSsePart(controller, encoder, {
      type: "text-end",
      id: textPartId,
    });
    emitSsePart(controller, encoder, {
      type: "data-casaora-meta",
      data: {
        messageId,
        model_used: typeof modelUsed === "string" ? modelUsed : null,
        fallback_used: fallbackUsed,
        tool_trace: Array.isArray(toolTrace) ? toolTrace : [],
      },
    });
    emitSsePart(controller, encoder, { type: "finish-step" });
    emitSsePart(controller, encoder, { type: "finish" });
    emitDone(controller, encoder);
    finished = true;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = backendResponse.body?.getReader();
      if (!reader) {
        controller.error(new Error("Missing backend stream."));
        return;
      }

      let buffer = "";

      const processEvent = (event: BackendEvent) => {
        const eventType = event.type ?? "";

        if (eventType === "status") {
          ensureStart(controller, encoder);
          emitSsePart(controller, encoder, {
            type: "data-casaora-status",
            data: { message: event.message ?? "" },
          });
          return;
        }

        if (eventType === "tool_call") {
          ensureStart(controller, encoder);
          const toolName =
            typeof event.name === "string" && event.name.trim()
              ? event.name.trim()
              : "tool";
          toolCallCounter += 1;
          const toolCallId = `tool-call-${toolCallCounter}`;
          const queue = pendingToolCalls.get(toolName) ?? [];
          queue.push(toolCallId);
          pendingToolCalls.set(toolName, queue);
          const input =
            event.args && typeof event.args === "object" ? event.args : {};
          emitSsePart(controller, encoder, {
            type: "tool-input-available",
            toolCallId,
            toolName,
            input,
          });
          emitSsePart(controller, encoder, {
            type: "data-casaora-tool",
            data: {
              phase: "call",
              tool_name: toolName,
              tool_call_id: toolCallId,
              args: input,
            },
          });
          return;
        }

        if (eventType === "tool_result") {
          ensureStart(controller, encoder);
          const toolName =
            typeof event.name === "string" && event.name.trim()
              ? event.name.trim()
              : "tool";
          const queue = pendingToolCalls.get(toolName) ?? [];
          const toolCallId =
            queue.shift() ?? `tool-call-${toolCallCounter + 1}`;
          pendingToolCalls.set(toolName, queue);
          emitSsePart(controller, encoder, {
            type: "tool-output-available",
            toolCallId,
            output: {
              ok: event.ok === true,
              preview: typeof event.preview === "string" ? event.preview : "",
            },
          });
          emitSsePart(controller, encoder, {
            type: "data-casaora-tool",
            data: {
              phase: "result",
              tool_name: toolName,
              tool_call_id: toolCallId,
              ok: event.ok === true,
              preview: typeof event.preview === "string" ? event.preview : "",
            },
          });
          return;
        }

        if (eventType === "token" && typeof event.text === "string") {
          ensureTextStart(controller, encoder);
          if (event.text.startsWith(currentText)) {
            const delta = event.text.slice(currentText.length);
            if (delta) {
              emitSsePart(controller, encoder, {
                type: "text-delta",
                id: textPartId,
                delta,
              });
            }
            currentText = event.text;
            return;
          }

          emitSsePart(controller, encoder, {
            type: "text-delta",
            id: textPartId,
            delta: event.text,
          });
          currentText = `${currentText}${event.text}`;
          return;
        }

        if (eventType === "done") {
          finalize(
            controller,
            encoder,
            typeof event.content === "string" ? event.content : "",
            event.model_used,
            event.fallback_used === true,
            event.tool_trace
          );
          return;
        }

        if (eventType === "error") {
          ensureStart(controller, encoder);
          emitSsePart(controller, encoder, {
            type: "error",
            errorText:
              typeof event.message === "string"
                ? event.message
                : "Agent streaming error.",
          });
          finalize(controller, encoder, "", null, false, []);
        }
      };

      const readLoop = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") {
              continue;
            }

            let event: BackendEvent | null = null;
            try {
              event = JSON.parse(raw) as BackendEvent;
            } catch {
              event = null;
            }

            if (event) {
              processEvent(event);
              if (finished) {
                break;
              }
            }
          }

          if (finished) {
            break;
          }
        }

        if (!finished) {
          finalize(controller, encoder, currentText, null, false, []);
        }

        controller.close();
      };

      readLoop().catch((error) => {
        controller.error(error);
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}
