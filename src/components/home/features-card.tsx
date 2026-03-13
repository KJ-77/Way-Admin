import { useTranslation } from "react-i18next"

const FeaturesCard = () => {
  const { t } = useTranslation()

  return (
    <div className="mt-8 p-6 rounded-lg border bg-card text-card-foreground">
      <h2 className="text-2xl font-semibold mb-4">
        {t("home.setupComplete")}
      </h2>
      <ul className="text-left space-y-2 text-muted-foreground">
        <li>{t("home.features.vite")}</li>
        <li>{t("home.features.tailwind")}</li>
        <li>{t("home.features.shadcn")}</li>
        <li>{t("home.features.router")}</li>
        <li>{t("home.features.paths")}</li>
        <li>{t("home.features.darkMode")}</li>
        <li>{t("home.features.i18n")}</li>
      </ul>
    </div>
  )
}

export default FeaturesCard
