"use client";

import { useEffect, useMemo, useState } from "react";
import { sendApplicationMessageAction } from "@/app/(admin)/module/applications/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, FieldGroup } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ApplicationMessageTemplateOption = {
  id: string;
  channel: string;
  name: string;
  subject?: string | null;
  body: string;
};

type ApplicationMessageDrawerProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  orgId: string;
  applicationId: string;
  applicantName: string;
  email: string | null;
  phoneE164: string | null;
  isEn: boolean;
  returnTo: string;
  templates: ApplicationMessageTemplateOption[];
};

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

export function ApplicationMessageDrawer({
  open,
  onOpenChange,
  orgId,
  applicationId,
  applicantName,
  email,
  phoneE164,
  isEn,
  returnTo,
  templates,
}: ApplicationMessageDrawerProps) {
  const [channel, setChannel] = useState(() =>
    phoneE164 ? "whatsapp" : "email"
  );
  const [recipient, setRecipient] = useState(phoneE164 || email || "");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => template.channel.toLowerCase() === channel),
    [channel, templates]
  );

  const preferredRecipient = useMemo(() => {
    if (channel === "email") return email || "";
    return phoneE164 || email || "";
  }, [channel, email, phoneE164]);

  useEffect(() => {
    setRecipient(preferredRecipient);
  }, [preferredRecipient]);

  useEffect(() => {
    const selected = filteredTemplates.find((template) => template.id === templateId);
    if (!selected) return;
    setBody(selected.body);
    setSubject(selected.subject ?? "");
  }, [filteredTemplates, templateId]);

  const recipientHint =
    channel === "email"
      ? isEn
        ? "Send via email to the applicant or override the destination."
        : "Enviar por correo al solicitante o ajustar el destino."
      : isEn
        ? "Send a WhatsApp follow-up with the same application context."
        : "Enviar seguimiento por WhatsApp con el mismo contexto de la aplicación.";

  const recipientInvalid =
    !recipient ||
    (channel === "email" ? !looksLikeEmail(recipient) : recipient.length < 8);

  return (
    <Drawer
      className="w-[min(94vw,38rem)]"
      closeLabel={isEn ? "Close follow-up composer" : "Cerrar seguimiento"}
      description={
        isEn
          ? "Send a logged follow-up from the leasing workflow. The message stays linked to this application."
          : "Envía un seguimiento registrado desde leasing. El mensaje queda vinculado a esta aplicación."
      }
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      title={isEn ? `Follow up ${applicantName}` : `Dar seguimiento a ${applicantName}`}
    >
      <Form action={sendApplicationMessageAction} className="space-y-6 px-4 py-5 sm:px-6">
        <input name="organization_id" type="hidden" value={orgId} />
        <input name="application_id" type="hidden" value={applicationId} />
        <input name="next" type="hidden" value={returnTo} />

        <FieldGroup>
          <Field htmlFor={`application-message-channel-${applicationId}`} label={isEn ? "Channel" : "Canal"} required>
            <Select
              id={`application-message-channel-${applicationId}`}
              name="channel"
              onChange={(event) => {
                setChannel(event.target.value);
                setTemplateId("");
              }}
              value={channel}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </Select>
          </Field>
          <Field
            description={recipientHint}
            error={
              recipientInvalid
                ? isEn
                  ? "Enter a valid recipient for the selected channel."
                  : "Ingresa un destinatario valido para el canal seleccionado."
                : null
            }
            htmlFor={`application-message-recipient-${applicationId}`}
            label={isEn ? "Recipient" : "Destinatario"}
            required
          >
            <Input
              id={`application-message-recipient-${applicationId}`}
              name="recipient"
              onChange={(event) => setRecipient(event.target.value)}
              placeholder={
                channel === "email"
                  ? "applicant@example.com"
                  : "+595981000000"
              }
              required
              value={recipient}
            />
          </Field>
        </FieldGroup>

        <Field htmlFor={`application-message-template-${applicationId}`} label={isEn ? "Template" : "Plantilla"}>
          <Select
            id={`application-message-template-${applicationId}`}
            name="template_id"
            onChange={(event) => setTemplateId(event.target.value)}
            value={templateId}
          >
            <option value="">{isEn ? "Start from blank" : "Comenzar en blanco"}</option>
            {filteredTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
        </Field>

        {channel === "email" ? (
          <Field htmlFor={`application-message-subject-${applicationId}`} label={isEn ? "Subject" : "Asunto"}>
            <Input
              id={`application-message-subject-${applicationId}`}
              name="subject"
              onChange={(event) => setSubject(event.target.value)}
              value={subject}
            />
          </Field>
        ) : (
          <input name="subject" type="hidden" value={subject} />
        )}

        <Field
          htmlFor={`application-message-body-${applicationId}`}
          label={isEn ? "Message body" : "Mensaje"}
          required
        >
          <Textarea
            id={`application-message-body-${applicationId}`}
            name="body"
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              isEn
                ? "Share the next step, requested documents, or schedule details."
                : "Comparte el siguiente paso, documentos requeridos o detalles de agenda."
            }
            required
            value={body}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
            {isEn ? "Cancel" : "Cancelar"}
          </Button>
          <Button disabled={recipientInvalid || !body.trim()} type="submit">
            {isEn ? "Send follow-up" : "Enviar seguimiento"}
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
