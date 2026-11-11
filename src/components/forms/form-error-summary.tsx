type FormErrorSummaryProps = { message?: string };

export function FormErrorSummary({ message }: FormErrorSummaryProps) {
  if (!message) return null;

  return (
    <p role="alert" className="text-sm text-destructive">
      Error: {message}
    </p>
  );
}
