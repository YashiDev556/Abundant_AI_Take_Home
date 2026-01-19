import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: [
          "relative rounded-lg",
          "bg-gradient-to-b from-zinc-700 to-zinc-900",
          "dark:from-zinc-600 dark:to-zinc-800",
          "text-white",
          "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]",
          "hover:from-zinc-600 hover:to-zinc-800",
          "dark:hover:from-zinc-500 dark:hover:to-zinc-700",
          "border border-zinc-950/20 dark:border-zinc-950/50",
        ],
        destructive: [
          "relative rounded-lg",
          "bg-gradient-to-b from-red-500 to-red-700",
          "text-white",
          "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:from-red-400 hover:to-red-600",
          "border border-red-900/30",
        ],
        outline: [
          "relative rounded-lg",
          "bg-background",
          "border border-border",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
          "hover:bg-secondary",
        ],
        secondary: [
          "relative rounded-lg",
          "bg-gradient-to-b from-zinc-100 to-zinc-200",
          "dark:from-zinc-700 dark:to-zinc-800",
          "text-zinc-900 dark:text-zinc-100",
          "shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]",
          "dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:from-zinc-50 hover:to-zinc-150",
          "dark:hover:from-zinc-600 dark:hover:to-zinc-700",
          "border border-zinc-300 dark:border-zinc-600",
        ],
        ghost: "hover:bg-secondary rounded-md",
        link: "text-foreground underline-offset-4 hover:underline",
        success: [
          "relative rounded-lg",
          "bg-gradient-to-b from-emerald-500 to-emerald-700",
          "text-white",
          "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:from-emerald-400 hover:to-emerald-600",
          "border border-emerald-900/30",
        ],
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
