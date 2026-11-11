import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-transparent text-sm font-medium whitespace-normal text-center select-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground focus-visible:outline-offset-4 disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-text-meta disabled:border-input disabled:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:border-foreground hover:bg-background hover:text-foreground",
        outline: "border-foreground bg-background text-foreground hover:bg-foreground hover:text-background",
        secondary: "border-foreground bg-background text-foreground hover:bg-foreground hover:text-background",
        ghost: "bg-transparent text-foreground underline-offset-4 hover:underline",
        link: "bg-transparent text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-3",
        xs: "px-2 py-3",
        sm: "px-3 py-3",
        lg: "px-6 py-4 text-base",
        icon: "size-11 p-3",
        "icon-xs": "size-11 p-3",
        "icon-sm": "size-11 p-3",
        "icon-lg": "size-12 p-3",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
