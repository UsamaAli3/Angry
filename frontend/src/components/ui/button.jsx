// shadcn/ui Button, adapted for JavaScript and this project's Tailwind v3 theme.
import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#913d53] text-white hover:bg-[#783044]",
        outline: "border border-[#d9c7c1] bg-transparent text-[#665354] hover:bg-[#f3e6e0]",
        ghost: "text-[#796465] hover:bg-[#f3e6e0]",
      },
      size: { default: "h-12 px-6 py-3", sm: "h-10 px-4", icon: "h-12 w-12" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const Button = forwardRef(({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
