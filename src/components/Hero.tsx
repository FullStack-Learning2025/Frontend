import { Button } from '@/components/ui/button';
import progressDashboard from '@/assets/progress-dashboard.png';
import { useLanguage } from '@/contexts/LanguageContext';

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="pt-32 pb-20 bg-gradient-hero">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
              {t.heroTitleLead}{' '}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                {t.heroTitleHighlight}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl">
              {t.heroDetailedSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-primary text-lg px-8" asChild>
                <a href="#advantages">{t.heroCtaStart}</a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <a href="#features">{t.heroCtaTrack}</a>
              </Button>
            </div>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">{t.heroAvailableOn}</p>
              <div className="flex items-center space-x-4">
                <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                    alt="Get it on Google Play"
                    className="h-10"
                  />
                </a>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" aria-hidden="true" />
            <img
              src={progressDashboard}
              alt="ExamWalk Progress Monitoring Dashboard"
              className="relative z-10 w-full h-auto rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
