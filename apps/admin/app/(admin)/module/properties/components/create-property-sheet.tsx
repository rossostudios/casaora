import { createPropertyFromPropertiesModuleAction } from "@/app/(admin)/module/properties/actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";

type CreatePropertySheetProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  orgId: string;
  title: string;
  description: string;
  nameLabel: string;
  codeLabel: string;
  cancelLabel: string;
  createLabel: string;
};

export function CreatePropertySheet({
  open,
  onOpenChange,
  orgId,
  title,
  description,
  nameLabel,
  codeLabel,
  cancelLabel,
  createLabel,
}: CreatePropertySheetProps) {
  return (
    <Sheet
      description={description}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <Form
        action={createPropertyFromPropertiesModuleAction}
        className="space-y-4"
      >
        <input name="organization_id" type="hidden" value={orgId} />
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {nameLabel}
          </span>
          <Input name="name" placeholder="Edificio Centro" required />
        </label>
        <label className="grid gap-1">
          <span className="font-medium text-muted-foreground text-xs">
            {codeLabel}
          </span>
          <Input name="code" placeholder="CEN-01" />
        </label>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {cancelLabel}
          </Button>
          <Button
            className="bg-[#1e2b61] font-semibold text-white hover:bg-[#1e2b61]/90"
            type="submit"
            variant="secondary"
          >
            {createLabel}
          </Button>
        </div>
      </Form>
    </Sheet>
  );
}
