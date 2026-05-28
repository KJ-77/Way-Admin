import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Action title shown in the dialog header. If omitted, falls back to a generic "Confirm".
  title?: string
  // Body text — what the user is confirming. If omitted, falls back to "Are you sure?".
  description?: string
  // Optional inline content (e.g. a one-line summary of the entity being modified).
  children?: React.ReactNode
  // Triggered when the user accepts. The dialog stays open until the caller closes it
  // (so the caller can show a loading state on the confirm button while the API call runs).
  onConfirm: () => void
  // Disables both buttons + shows a spinner on the confirm button while async work runs.
  loading?: boolean
  // Visual style of the confirm button. "destructive" for deletes, "default" for saves.
  variant?: "default" | "destructive"
  confirmLabel?: string
  cancelLabel?: string
}

const ConfirmDialog = ({
  open, onOpenChange, title, description, children, onConfirm, loading, variant = "default",
  confirmLabel, cancelLabel,
}: ConfirmDialogProps) => {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? t("common.confirm", "Confirm")}</DialogTitle>
          <DialogDescription>
            {description ?? t("common.areYouSure", "Are you sure?")}
          </DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel ?? t("common.confirm", "Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
