import { useState } from 'react';
import { Menu, X, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import purpleLogo from '@/assets/ExamWalk Purple Logo.svg';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const links = [
    { href: '#features', label: t.navFeatures },
    { href: '#advantages', label: t.navAdvantages },
    { href: '#testimonials', label: t.navTestimonials },
    { href: '#contact', label: t.navContact },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/80">
      <nav className="container">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center space-x-2">
            <img src={purpleLogo} alt="ExamWalk" className="h-9 w-auto" />
          </a>

          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-foreground hover:text-primary transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="text-sm font-medium"
            >
              <Languages className="h-4 w-4 mr-2" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button variant="ghost" className="text-sm font-medium" asChild>
              <a href="/login">{t.navLogin}</a>
            </Button>
            <Button className="bg-gradient-primary" asChild>
              <a href="/signup">{t.navGetStarted}</a>
            </Button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="text-sm font-medium"
            >
              <Languages className="h-4 w-4 mr-2" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
            <button
              type="button"
              className="p-2 rounded-lg border border-border text-foreground"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            <div className="flex flex-col space-y-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-foreground hover:text-primary transition-colors text-sm font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col space-y-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              >
                <Languages className="h-4 w-4 mr-2" />
                {language === 'en' ? 'العربية' : 'English'}
              </Button>
              <Button variant="ghost" asChild>
                <a href="/login" onClick={() => setIsMenuOpen(false)}>
                  {t.navLogin}
                </a>
              </Button>
              <Button className="bg-gradient-primary" asChild>
                <a href="/signup" onClick={() => setIsMenuOpen(false)}>
                  {t.navGetStarted}
                </a>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
