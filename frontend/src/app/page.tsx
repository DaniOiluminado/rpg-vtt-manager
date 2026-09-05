import Header from '../components/Header';
import AnnouncementCarousel from '../components/AnnouncementCarousel';
import CampaignGrid from '../components/CampaignGrid';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <AnnouncementCarousel />
      
      <main className="mx-auto w-full max-w-7xl px-6 flex-1">
        <CampaignGrid />
      </main>
    </div>
  );
}