import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";

const Card = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-3xl border border-[#e8dcd5] bg-[#fffdf9] text-[#3e3033] shadow-sm", className)} {...props} />
));
Card.displayName = "Card";
const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
));
CardContent.displayName = "CardContent";
export { Card, CardContent };
