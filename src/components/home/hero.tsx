import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

const Hero = () => {
  const { t } = useTranslation()

  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight">
        {t("home.title")}
      </h1>
      <p className="text-xl text-muted-foreground">
        {t("home.subtitle")}
      </p>
      <div className="flex gap-4 justify-center">
        <Button>{t("home.getStarted")}</Button>
        <Button variant="outline">{t("home.learnMore")}</Button>
      </div>
    </>
  )
}

export default Hero
