import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "rounded-xl",
    "font-semibold",
    "transition-all",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "cursor-pointer",
    "select-none",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-white",
          "text-black",
          "hover:bg-zinc-200",
        ],

        outline: [
          "border",
          "border-zinc-700",
          "bg-transparent",
          "text-white",
          "hover:bg-zinc-900",
        ],

        ghost: [
          "bg-transparent",
          "text-white",
          "hover:bg-zinc-900",
        ],

        destructive: [
          "bg-red-600",
          "text-white",
          "hover:bg-red-700",
        ],
      },

      size: {
        sm: "h-10 px-4",

        md: "h-12 px-6",

        lg: "h-14 px-8",

        icon: "h-12 w-12 p-0",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);