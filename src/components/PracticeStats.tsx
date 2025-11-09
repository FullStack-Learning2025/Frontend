import { useLanguage } from '@/contexts/LanguageContext';

const Stats = () => {
  const { t } = useLanguage();

  const stats = [
    { number: '10,000+', label: t.statsPracticeQuestions },
    { number: '50+', label: t.statsPastPapers },
    { number: '100+', label: t.statsExamsPerStudent },
    { number: '200+', label: t.statsHoursPractice },
  ];

  return (
    <section id="advantages" className="py-16 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
            {t.statsTitle}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto italic">
            {t.statsQuote}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className="text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
