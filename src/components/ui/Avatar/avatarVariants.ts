import { cva } from "class-variance-authority";

export const avatarVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "rounded-full",
    "text-white",
    "shrink-0",
  ],
  {
    variants: {
      size: {
        sm: "h-8 w-8",

        md: "h-12 w-12",

        lg: "h-16 w-16",
      },
    },

    defaultVariants: {
      size: "md",
    },
  }
);
