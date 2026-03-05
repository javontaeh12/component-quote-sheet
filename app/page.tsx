import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import PromoBanner from '../components/PromoBanner';
import BookingSection from '../components/BookingSection';
import WhyChooseUs from '../components/WhyChooseUs';
import HowItWorksSection from '../components/HowItWorksSection';
import MembershipSection from '../components/MembershipSection';
import TestimonialsSection from '../components/TestimonialsSection';
import FooterSection from '../components/FooterSection';
import StickyMobileCTA from '../components/StickyMobileCTA';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pb-14 sm:pb-0">
        <HeroSection />
        <PromoBanner />
        <HowItWorksSection />
        <BookingSection />
        <WhyChooseUs />
        <MembershipSection />
        <TestimonialsSection />
      </main>
      <FooterSection />
      <StickyMobileCTA />
    </>
  );
}
