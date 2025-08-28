
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-muted' : ''}
        >
          {t.english}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('ar')}
          className={language === 'ar' ? 'bg-muted' : ''}
        >
          {t.arabic}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
