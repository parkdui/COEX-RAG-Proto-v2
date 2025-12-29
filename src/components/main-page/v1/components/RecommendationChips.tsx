'use client';

import React from 'react';
import { renderTextWithAnimation } from '../utils/textUtils';

interface RecommendationChipsProps {
  recommendations: string[];
  onRecommendationClick: (recommendation: string) => void;
  isLoading: boolean;
  showRecommendationChips: boolean;
  additionalMarginTop?: number;
  compact?: boolean;
  shouldAnimate?: boolean;
}

export const RecommendationChips: React.FC<RecommendationChipsProps> = ({
  recommendations,
  onRecommendationClick,
  isLoading,
  showRecommendationChips,
  additionalMarginTop,
  compact = false,
  shouldAnimate = false,
}) => {
  return (
    <div
      className="recommendation-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '8px',
        marginTop: additionalMarginTop ? `${additionalMarginTop}px` : (compact ? '0' : '24px'),
        paddingTop: compact ? '0' : '24px',
        paddingBottom: compact ? '0' : '4px',
        width: '100%',
        opacity: shouldAnimate ? (showRecommendationChips ? 1 : 0) : 1,
        transition: shouldAnimate ? 'opacity 0.5s ease-in' : 'none',
      }}
    >
      {recommendations.map((message, index) => {
        return (
          <button
            key={index}
            onClick={() => onRecommendationClick(message)}
            disabled={isLoading}
            className="touch-manipulation active:scale-95 disabled:opacity-50 rounded-3xl outline outline-1 outline-offset-[-1px] outline-white"
            style={{
              display: 'inline-flex',
              padding: '8px 16px',
              justifyContent: 'center',
              alignItems: 'center',
              flex: '0 0 auto',
              cursor: 'pointer',
              background: 'linear-gradient(180deg,rgb(251, 255, 254) 0%, #F4E9F0 63.94%, #FFF 100%)',
            }}
            type="button"
          >
            <span
              style={{
                fontFamily: 'Pretendard Variable',
                fontSize: '14px',
                fontStyle: 'normal' as const,
                fontWeight: 600,
                lineHeight: '190%',
                letterSpacing: '-0.48px',
                color: '#757575',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {renderTextWithAnimation(message)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

