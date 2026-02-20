"use client";

import { Form as BaseForm } from "@base-ui/react/form";
import { type ComponentPropsWithRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

type FormProps = ComponentPropsWithRef<typeof BaseForm>;

export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ className, ...props }, ref) => {
    return <BaseForm className={cn(className)} ref={ref} {...props} />;
  }
);
