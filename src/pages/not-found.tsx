import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

const NotFound = () => {
  const { t } = useTranslation()

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-background text-foreground">
      <div className="max-w-md mx-auto p-8 text-center space-y-6">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-semibold">{t("notFound.title")}</h2>
        <p className="text-muted-foreground">{t("notFound.message")}</p>
        <Button asChild>
          <Link to="/">{t("notFound.backHome")}</Link>
        </Button>
      </div>
    </div>
  )
}

export default NotFound
