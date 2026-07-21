import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { MessageSquare, UserPlus, PackageCheck, Megaphone, Send, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ⚠️ PREVIEW ONLY — mock data. The real communications queue (automated WhatsApp/SMS
// with human-in-the-loop approval) is a planned feature. This widget shows where it
// will live and how the review-before-send flow will feel, using placeholder messages.
const MOCK_QUEUE = [
  {
    id: 1,
    icon: UserPlus,
    title: "Welcome message",
    recipient: "Sara Mansour",
    trigger: "New client created",
    channel: "WhatsApp",
    tone: "text-chart-1 bg-chart-1/10",
  },
  {
    id: 2,
    icon: PackageCheck,
    title: "Ready for pickup",
    recipient: "Ahmad Bazzi",
    trigger: "Item → Ready for Pickup",
    channel: "WhatsApp",
    tone: "text-chart-4 bg-chart-4/10",
  },
  {
    id: 3,
    icon: Megaphone,
    title: "Summer glaze workshop",
    recipient: "All clients · 128",
    trigger: "Manual broadcast",
    channel: "SMS",
    tone: "text-chart-3 bg-chart-3/10",
  },
]

const CommunicationsPreview = () => {
  const { t } = useTranslation()

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t("dashboard.communications")}</CardTitle>
          </div>
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-500">
            {t("dashboard.preview")}
          </Badge>
        </div>
        <CardDescription>{t("dashboard.communicationsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {MOCK_QUEUE.map(msg => (
          <div key={msg.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className={`rounded-lg p-2 ${msg.tone}`}>
              <msg.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{msg.title}</p>
                <Badge variant="secondary" className="text-[10px]">{msg.channel}</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {msg.recipient} · {msg.trigger}
              </p>
            </div>
            <Badge variant="outline" className="hidden shrink-0 items-center gap-1 border-amber-500/30 text-amber-500 sm:inline-flex">
              <Clock className="h-3 w-3" />
              {t("dashboard.pendingApproval")}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={() => toast.info(t("dashboard.communicationsComingSoon"))}
            >
              <Send className="h-3.5 w-3.5" />
              {t("dashboard.approveSend")}
            </Button>
          </div>
        ))}
        <p className="pt-1 text-center text-xs text-muted-foreground">
          {t("dashboard.communicationsFootnote")}
        </p>
      </CardContent>
    </Card>
  )
}

export default CommunicationsPreview
