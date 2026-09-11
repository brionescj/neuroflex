import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1">
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
            p === page
              ? "bg-white text-black"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}