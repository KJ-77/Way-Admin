import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { MessageStatus } from "@/types"

// Colour carries meaning here, so it's mapped deliberately rather than left to a
// default variant:
//   amber  — needs a human (waiting for approval, or an unconfirmed send)
//   blue   — in flight, on its way
//   green  — confirmed on the recipient's phone
//   red    — didn't arrive
//   muted  — deliberately stopped
//
// 'queued' is amber, not blue, on purpose. It means "handed to the provider, result
// never recorded" — the one state that genuinely needs someone to look at it.
const STATUS_STYLES: Record<MessageStatus, string> = {
  pending_approval: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  queued: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  sent: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delivered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  read: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  cancelled: "border-muted-foreground/30 bg-muted text-muted-foreground",
}

interface Props {
  status: MessageStatus
  /** Provider error text, shown in a tooltip on failed messages. */
  errorMessage?: string | null
}

const MessageStatusBadge = ({ status, errorMessage }: Props) => {
  const { t } = useTranslation()

  const badge = (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {t(`communications.status.${status}`)}
    </Badge>
  )

  // Surface the provider's own words on hover. Staff can't fix "failed", but they
  // can fix "invalid destination number" — so the detail is worth one hover.
  if (status === "failed" && errorMessage) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{errorMessage}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return badge
}

export default MessageStatusBadge
