import type { CSSProperties } from 'react';

interface VerticalCarouselTextProps {
  text: string;
  duration?: number; // milliseconds
  stagger?: number; // milliseconds
  className?: string;
  style?: CSSProperties;
  characterClassName?: string;
  enableColorAnimation?: boolean; // Sori black-white animation
}

export default function VerticalCarouselText({
  text,
  duration = 4500,
  stagger = 140,
  className = '',
  style,
  characterClassName = '',
  enableColorAnimation = false,
}: VerticalCarouselTextProps) {
  const characters = Array.from(text);
  
  const getColorAnimationStyle = (index: number): CSSProperties => {
    if (!enableColorAnimation) return {};
    
    const initialColors = ['#000000', '#333333', '#000000', '#000000'];
    const animationNames = ['soriLetterColorS', 'soriLetterColorO', 'soriLetterColorR', 'soriLetterColorI'];
    const sequentialDelay = index * 0.1;
    
    return {
      color: initialColors[index] || '#000000',
      animation: `${animationNames[index] || 'soriLetterColorS'} 6s ease-in-out ${sequentialDelay}s infinite`,
    };
  };

  return (
    <div
      className={`vertical-carousel-text${className ? ` ${className}` : ''}`}
      style={style}
    >
      {characters.map((char, index) => {
        if (char === ' ') {
          return (
            <span
              key={`vertical-carousel-space-${index}`}
              className="vertical-carousel-space"
            >
              &nbsp;
            </span>
          );
        }

        const delay = `${index * stagger}ms`;
        // Entrance animation duration: 8% of total duration
        const entranceDuration = duration * 0.08;
        // Loop animation delay: entrance duration + character delay
        const loopDelay = entranceDuration + (index * stagger);

        return (
          <span
            key={`vertical-carousel-char-${index}`}
            className={`vertical-carousel-character${characterClassName ? ` ${characterClassName}` : ''}`}
          >
            <span
              className="vertical-carousel-track"
              style={
                {
                  '--entrance-delay': `${loopDelay}ms`,
                  animationDuration: `${entranceDuration}ms, ${duration}ms`,
                  animationDelay: `${delay}, ${loopDelay}ms`,
                } as CSSProperties
              }
            >
              <span className="vertical-carousel-letter" style={getColorAnimationStyle(index)}>{char}</span>
              <span className="vertical-carousel-letter" style={getColorAnimationStyle(index)}>{char}</span>
            </span>
          </span>
        );
      })}

      <style jsx>{`
        .vertical-carousel-text {
          display: inline-flex;
          gap: 0;
          align-items: flex-end;
        }

        .vertical-carousel-character {
          position: relative;
          display: inline-flex;
          overflow: hidden;
          height: 1em;
          line-height: 1;
        }

        .vertical-carousel-track {
          display: flex;
          flex-direction: column;
          align-items: center;
          will-change: transform;
          animation-name: vertical-carousel-entrance, vertical-carousel-loop;
          animation-timing-function: ease-in-out, ease-in-out;
          animation-iteration-count: 1, infinite;
          animation-fill-mode: forwards, none;
          animation-delay: 0s, var(--entrance-delay, 0s);
          transform: translateY(100%);
        }

        .vertical-carousel-letter {
          display: block;
          transform: translateY(0%);
        }

        .vertical-carousel-space {
          display: inline-block;
          width: 0.38em;
        }

        @keyframes vertical-carousel-entrance {
          0% {
            transform: translateY(100%);
          }
          100% {
            transform: translateY(0%);
          }
        }
        
        @keyframes vertical-carousel-loop {
          0%,
          40% {
            transform: translateY(0%);
          }
          55% {
            transform: translateY(-106%);
          }
          70%,
          100% {
            transform: translateY(-100%);
          }
        }
        
        @keyframes soriLetterColorS {
          0%, 16.67% { color: #000000; }
          25% { color: #ffffff; }
          33.33%, 100% { color: #000000; }
        }
        
        @keyframes soriLetterColorO {
          0%, 16.67% { color: #333333; }
          25% { color: #ffffff; }
          33.33%, 100% { color: #000000; }
        }
        
        @keyframes soriLetterColorR {
          0%, 16.67% { color: #000000; }
          25% { color: #ffffff; }
          33.33%, 100% { color: #000000; }
        }
        
        @keyframes soriLetterColorI {
          0%, 16.67% { color: #000000; }
          25% { color: #ffffff; }
          33.33%, 100% { color: #000000; }
        }
      `}</style>
    </div>
  );
}

