import { useState } from "react"
import { useTranslation } from "react-i18next"
import { MessageSquare, ChevronRight, Loader2, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import MessageStatusBadge from "./message-status-badge"
import { friendlyError } from "@/lib/errors"
import type { Conversation, Message } from "@/types"

interface Props {
  conversations: Conversation[]
  loading: boolean
  onGetMessages: (conversationId: number) => Promise<Message[]>
}

/**
 * Per-client message history.
 *
 * On SMS this is a send LOG, not a chat — Lebanon has no inbound SMS, so every row
 * here is outbound by definition. It answers the question staff actually ask: "what
 * have we sent this person, and did it land?"
 *
 * The rendering already handles inbound messages (they align to the other side), so
 * this becomes a genuine two-way inbox with no changes the day WhatsApp is enabled.
 */
const MessageHistory = ({ conversations, loading, onGetMessages }: Props) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)

  const openThread = async (conversation: Conversation) => {
    setSelected(conversation)
    setLoadingThread(true)
    setThreadError(null)
    try {
      setMessages(await onGetMessages(conversation.id))
    } catch (err) {
      setThreadError(friendlyError(err, "communications.operationFailed"))
      setMessages([])
    } finally {
      setLoadingThread(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  // ── Thread view ──
  if (selected) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            <span className="sr-only">{t("common.back")}</span>
          </Button>
          <div>
            <CardTitle className="text-base">{selected.user_name}</CardTitle>
            <CardDescription dir="ltr">{selected.phone}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {loadingThread ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : threadError ? (
            <p className="py-8 text-center text-sm text-destructive">{threadError}</p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("communications.noMessagesYet")}
            </p>
          ) : (
            <ScrollArea className="h-[26rem] pe-3">
              <div className="space-y-3">
                {messages.map(message => {
                  const isOutbound = message.direction === "outbound"
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg border p-3 ${
                          isOutbound ? "bg-primary/5" : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <MessageStatusBadge
                            status={message.status}
                            errorMessage={message.error_message}
                          />
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.sent_at ?? message.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── List view ──
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {t("communications.historyTitle")}
        </CardTitle>
        <CardDescription>{t("communications.historyDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {conversations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("communications.noConversations")}
          </p>
        ) : (
          conversations.map(conversation => (
            <button
              key={conversation.id}
              onClick={() => openThread(conversation)}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-start transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{conversation.user_name}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {conversation.phone}
                  </span>
                </div>
                {conversation.last_message_preview && (
                  <p className="truncate text-sm text-muted-foreground">
                    {conversation.last_message_preview}
                  </p>
                )}
              </div>
              {conversation.last_message_at && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(conversation.last_message_at).toLocaleDateString()}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
            </button>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default MessageHistory
