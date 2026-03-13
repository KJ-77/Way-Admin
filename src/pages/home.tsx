import Hero from "@/components/home/hero"
import FeaturesCard from "@/components/home/features-card"

const Home = () => {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-8 text-center space-y-6">
        <Hero />
        <FeaturesCard />
      </div>
    </div>
  )
}

export default Home
