import React, { useEffect, useRef, useState } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'typing';
}

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 0,
  duration = 0.6,
  stagger = 0.05,
  animation = 'fadeIn'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getAnimationClass = () => {
    const baseClasses = 'inline-block';
    const animationClasses = {
      fadeIn: isVisible ? 'opacity-100' : 'opacity-0',
      slideUp: isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      slideDown: isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
      slideLeft: isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0',
      slideRight: isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
      scale: isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
      typing: isVisible ? 'opacity-100' : 'opacity-0'
    };

    return `${baseClasses} transition-all duration-${Math.round(duration * 1000)} ease-out ${animationClasses[animation]}`;
  };

  const getAnimationStyle = (index: number) => {
    const transitionDelay = isVisible ? `${index * stagger}s` : '0s';
    return {
      transitionDelay,
      transitionDuration: `${duration}s`
    };
  };

  // 텍스트를 문자 단위로 분할
  const characters = text.split('');

  return (
    <div ref={containerRef} className={className}>
      {characters.map((char, index) => (
        <span
          key={index}
          className={getAnimationClass()}
          style={getAnimationStyle(index)}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </div>
  );
};

interface SplitWordsProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale';
}

export const SplitWords: React.FC<SplitWordsProps> = ({
  text,
  className = '',
  delay = 0,
  duration = 0.6,
  stagger = 0.1,
  animation = 'fadeIn'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getAnimationClass = () => {
    const baseClasses = 'inline-block mr-1';
    const animationClasses = {
      fadeIn: isVisible ? 'opacity-100' : 'opacity-0',
      slideUp: isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      slideDown: isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
      slideLeft: isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0',
      slideRight: isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
      scale: isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
    };

    return `${baseClasses} transition-all duration-${Math.round(duration * 1000)} ease-out ${animationClasses[animation]}`;
  };

  const getAnimationStyle = (index: number) => {
    const transitionDelay = isVisible ? `${index * stagger}s` : '0s';
    return {
      transitionDelay,
      transitionDuration: `${duration}s`
    };
  };

  // 텍스트를 단어 단위로 분할
  const words = text.split(' ');

  return (
    <div ref={containerRef} className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={getAnimationClass()}
          style={getAnimationStyle(index)}
        >
          {word}
        </span>
      ))}
    </div>
  );
};

interface TypingEffectProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  showCursor?: boolean;
}

export const TypingEffect: React.FC<TypingEffectProps> = ({
  text,
  className = '',
  speed = 50,
  delay = 0,
  showCursor = true
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!isTyping) return;

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, isTyping]);

  return (
    <div className={className}>
      <span>{displayedText}</span>
      {showCursor && isTyping && (
        <span className="animate-pulse">|</span>
      )}
    </div>
  );
};
