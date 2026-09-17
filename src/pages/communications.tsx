import { useTranslation } from "react-i18next"
import { Info } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { ACTIVE_CHANNEL, isManualChannel } from "@/lib/channel"
import { useUsers } from "@/hooks/use-users"
import {
  useMessageQueue,
  useMessageTemplates,
  useConversations,
  useBroadcasts,
} from "@/hooks/use-messaging"
import ApprovalQueue from "@/components/communications/approval-queue"
import NeedsAttention from "@/components/communications/needs-attention"
import MessageComposer from "@/components/communications/message-composer"
import TemplatesPanel from "@/components/communications/templates-panel"
import BroadcastPanel from "@/components/communications/broadcast-panel"
import MessageHistory from "@/components/communications/message-history"

const CommunicationsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.groups.includes("admin")
  // Broadcasts are off while messages are sent by hand: 130 near-identical sends from
  // one personal number is exactly what gets a WhatsApp number banned. The studio uses
  // a WhatsApp group or community for announcements instead. The backend refuses too;
  // hiding the tab just keeps staff from hitting that wall.
  const showBroadcasts = isAdmin && !isManualChannel(ACTIVE_CHANNEL)

  const {
    queue, unconfirmed, loading, error, refetch,
    approve, handoff, cancel, requeue, resolve, createMessage,
  } = useMessageQueue()
  const { templates, loading: templatesLoading, refetch: refetchTemplates, updateTemplate } =
    useMessageTemplates()
  const { conversations, loading: conversationsLoading, getMessages } = useConversations()
  const {
    broadcasts, loading: broadcastsLoading, refetch: refetchBroadcasts,
    createBroadcast, drainAll,
  } = useBroadcasts()
  const { users } = useUsers()

  // Failed messages are re-queueable, so they belong in the attention panel next to
  // the unconfirmed ones rather than cluttering the pending queue.
  const failed = queue.filter(m => m.status === "failed")
  const pending = queue.filter(m => m.status === "pending_approval")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("communications.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("communications.subtitle")}</p>
        </div>
        <MessageComposer
          users={users}
          templates={templates}
          onCreate={createMessage}
          onCreated={refetch}
        />
      </div>

      {/* Standing explanation of how sending works. With hand-sent WhatsApp the
          dashboard never sends anything itself — staff do, then confirm — which
          isn't something anyone would guess from an "Open in WhatsApp" button.
          (The i18n key is still named smsNotice from the SMS version.) */}
      <div className="flex gap-2 rounded-lg border bg-muted/40 p-3">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{t("communications.smsNotice")}</p>
      </div>

      <NeedsAttention
        unconfirmed={unconfirmed}
        failed={failed}
        onResolve={resolve}
        onRequeue={requeue}
        onDiscard={cancel}
        onRefetch={refetch}
      />

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            {t("communications.tabQueue")}
            {pending.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">{t("communications.tabHistory")}</TabsTrigger>
          <TabsTrigger value="templates">{t("communications.tabTemplates")}</TabsTrigger>
          {/* Admin-only (broadcasts cost money and can damage sender reputation),
              and hidden entirely on hand-sent WhatsApp — see showBroadcasts. The
              backend enforces both; hiding the tab is convenience, not the
              security boundary. */}
          {showBroadcasts && <TabsTrigger value="broadcasts">{t("communications.tabBroadcasts")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="queue" className="pt-4">
          <ApprovalQueue
            messages={pending}
            loading={loading}
            error={error}
            onApprove={approve}
            onHandoff={handoff}
            onCancel={cancel}
            onRefetch={refetch}
          />
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <MessageHistory
            conversations={conversations}
            loading={conversationsLoading}
            onGetMessages={getMessages}
          />
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          <TemplatesPanel
            templates={templates}
            loading={templatesLoading}
            onUpdate={updateTemplate}
            onRefetch={refetchTemplates}
          />
        </TabsContent>

        {showBroadcasts && (
          <TabsContent value="broadcasts" className="pt-4">
            <BroadcastPanel
              broadcasts={broadcasts}
              templates={templates}
              loading={broadcastsLoading}
              onCreate={createBroadcast}
              onDrainAll={drainAll}
              onRefetch={refetchBroadcasts}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default CommunicationsPage
