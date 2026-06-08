import LandingSections from '@/components/LandingSections'
import HeroSection from '@/components/HeroSection'
import Navbar from '@/components/Navbar'

export default function Home() {
  return (
    <main className="site-page">
      <div className="page-frame">
        <Navbar />
        <div className="frame-rule" aria-hidden="true">
          <span />
          <span />
        </div>
        <HeroSection />
      </div>
      <LandingSections />
    </main>
  )
}
