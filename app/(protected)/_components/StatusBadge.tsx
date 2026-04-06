type Props = {
  status: string;
};

export function StatusBadge({ status }: Props) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    canceled: "bg-gray-200 text-gray-600",
    past_due: "bg-red-100 text-red-700",
    unknown: "bg-gray-200 text-gray-600",
  };

  const label: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    canceled: "Canceled",
    past_due: "Past due",
    unknown: "Unknown",
  };

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.unknown}`}
    >
      {label[status] ?? label.unknown}
    </span>
  );
}
