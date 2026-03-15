import { useTranslation } from "react-i18next"
import ScheduleCalendar from "@/components/schedule/schedule-calendar"

const SchedulePage = () => {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("schedule.title")}</h1>
        <p className="text-muted-foreground">{t("schedule.description")}</p>
      </div>
      <ScheduleCalendar />
    </div>
  )
}

export default SchedulePage
