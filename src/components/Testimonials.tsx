
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import studentsExam from '@/assets/students-exam.png';
import { useLanguage } from '@/contexts/LanguageContext';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'SAT Score: 1480/1600',
    content:
      'Practicing with real previous SAT questions and monitoring my progress daily helped me improve 200 points! The AI identified exactly where I was struggling.',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'ACT Score: 34/36',
    content:
      'The step-by-step guidance and real-time analytics transformed my preparation. I could see my progress in each section and knew exactly what to focus on.',
    rating: 5,
  },
  {
    name: 'Fatima Ahmed',
    role: 'EST Score: 92%',
    content:
      'The collection of previous exam questions gave me confidence. Progress monitoring kept me motivated and the AI adapted perfectly to my learning pace!',
    rating: 5,
  },
];

const Testimonials = () => {
  const { t } = useLanguage();

  return (
    <section id="testimonials" className="py-20 bg-gradient-hero">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            {t.testimonialsTitle}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t.testimonialsSubtitle}
          </p>
        </div>

        <div className="mb-12">
          <img
            src={studentsExam}
            alt="Students taking practice exams"
            className="w-full h-auto rounded-2xl shadow-2xl max-w-4xl mx-auto"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-border bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex mb-4 text-primary">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  “{testimonial.content}”
                </p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
