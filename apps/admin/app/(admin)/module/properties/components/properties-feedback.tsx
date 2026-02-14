import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PropertiesFeedbackProps = {
  error: string;
  success: string;
  errorLabel: string;
  successLabel: string;
};

export function PropertiesFeedback({
  error,
  success,
  errorLabel,
  successLabel,
}: PropertiesFeedbackProps) {
  if (!(error || success)) return null;

  return (
    <div className="space-y-4">
      {error ? (
        <Alert
          className="rounded-xl border-red-200 bg-red-50/50"
          variant="destructive"
        >
          <AlertTitle>{errorLabel}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert className="rounded-xl" variant="success">
          <AlertTitle>
            {successLabel}: {success}
          </AlertTitle>
        </Alert>
      ) : null}
    </div>
  );
}
