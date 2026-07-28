type FieldErrorProps = {
  errors?: Array<{ message?: string } | undefined>;
};

export function FieldError({
  errors,
}: FieldErrorProps) {
  if (!errors?.length) {
    return null;
  }

  const unique = [
    ...new Map(
      errors.map(error => [error?.message, error])
    ).values(),
  ];

  return (
    <div className="text-sm text-red-500">
      {unique.length === 1 ? (
        unique[0]?.message
      ) : (
        <ul className="ml-5 list-disc space-y-1">
          {unique.map((error, index) =>
            error?.message ? (
              <li key={index}>{error.message}</li>
            ) : null
          )}
        </ul>
      )}
    </div>
  );
}