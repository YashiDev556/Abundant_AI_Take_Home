"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, CheckCircle, Info, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConfirmVariant = 'default' | 'destructive' | 'success' | 'warning'

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  isLoading?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

const variantConfig: Record<ConfirmVariant, {
  icon: typeof AlertTriangle
  iconClassName: string
  buttonClassName: string
}> = {
  default: {
    icon: Info,
    iconClassName: 'text-primary bg-primary/10',
    buttonClassName: '',
  },
  destructive: {
    icon: AlertTriangle,
    iconClassName: 'text-red-500 bg-red-500/10',
    buttonClassName: 'bg-red-600 hover:bg-red-700',
  },
  success: {
    icon: CheckCircle,
    iconClassName: 'text-emerald-500 bg-emerald-500/10',
    buttonClassName: 'bg-emerald-600 hover:bg-emerald-700',
  },
  warning: {
    icon: Send,
    iconClassName: 'text-amber-500 bg-amber-500/10',
    buttonClassName: 'bg-amber-600 hover:bg-amber-700',
  },
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-full", config.iconClassName)}>
              <Icon className="size-5" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </DialogBody>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn("min-w-[100px]", config.buttonClassName)}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
