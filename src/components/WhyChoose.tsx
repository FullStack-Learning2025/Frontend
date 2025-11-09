import { Card, CardContent } from '@/components/ui/card';
import { Brain, TrendingUp, Target, BarChart3, FileText } from 'lucide-react';
import featureAi from '@/assets/feature-ai.png';
import featureProgress from '@/assets/progress-dashboard.png';
import featureSyllabus from '@/assets/feature-syllabus.png';
import featureTest from '@/assets/feature-test.png';
import { useLanguage } from '@/contexts/LanguageContext';

const WhyChoose = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Brain,
      title: t.whyChooseAiTitle,
      description: t.whyChooseAiDesc,
      image: featureAi,
    },
    {
      icon: TrendingUp,
      title: t.whyChooseProgressTitle,
      description: t.whyChooseProgressDesc,
      image: featureProgress,
    },
    {
      icon: Target,
      title: t.whyChooseGuidanceTitle,
      description: t.whyChooseGuidanceDesc,
      image: featureSyllabus,
    },
    {
      icon: BarChart3,
      title: t.whyChooseAnalyticsTitle,
      description: t.whyChooseAnalyticsDesc,
      image: featureTest,
    },
    {
      icon: FileText,
      title: t.whyChoosePreviousTitle,
      description: t.whyChoosePreviousDesc,
      image: featureTest,
    },
  ];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            {t.whyChooseTitle}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t.whyChooseSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <div className="p-3 bg-primary/10 rounded-lg w-fit">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
