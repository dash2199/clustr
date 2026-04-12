import Header from "./components/Header/Header";
import HeroSection from "./components/HeroSection/HeroSection";
import FeaturesSection from "./components/FeaturesSection/FeaturesSection";
import AgentsSection from "./components/AgentsSection/AgentsSection";
import HowItWorksSection from "./components/HowItWorksSection/HowItWorksSection";
import CTASection from "./components/CTASection/CTASection";
import Footer from "./components/Footer/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AgentsSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
