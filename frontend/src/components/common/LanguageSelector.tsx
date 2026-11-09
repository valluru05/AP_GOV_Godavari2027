import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { AVAILABLE_LANGUAGES, changeAppLanguage, type SupportedLanguage } from '../../i18n';

interface LanguageSelectorProps {
  className?: string;
  compactOnMobile?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  compactOnMobile = false,
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language?.slice(0, 2) as SupportedLanguage) || 'en';
  const currentLanguageConfig =
    AVAILABLE_LANGUAGES.find((lang) => lang.code === currentLang) || AVAILABLE_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (langCode: SupportedLanguage) => {
    changeAppLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E9DED2] bg-white hover:bg-[#FFF8EE] hover:border-[#E87512] text-[#35251E] transition-all text-xs font-semibold shadow-subtle focus:outline-none focus:ring-2 focus:ring-[#E87512]/30"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Select Language / భాషను ఎంచుకోండి / भाषा चुनें"
      >
        <Globe className="w-3.5 h-3.5 text-[#E87512] shrink-0" />
        <span className={compactOnMobile ? 'hidden sm:inline font-medium' : 'font-medium'}>
          {currentLanguageConfig.nativeName}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[#7C7168] transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-[#E9DED2] shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5">
          <div className="px-3.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[#7C7168] border-b border-[#FAF4EC] mb-1">
            Language / భాష / भाषा
          </div>
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FEF3E8] text-[#8F2D16] font-bold'
                    : 'text-[#35251E] hover:bg-[#FAF4EC]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-xs">{lang.nativeName}</span>
                  <span className="text-[10px] text-[#7C7168] font-normal">{lang.name}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#E87512] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
