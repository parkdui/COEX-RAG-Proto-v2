'use client';

import React from 'react';
import LetterColorAnimation from '@/components/ui/LetterColorAnimation';

export const importantKeywords = [
  '핫플레이스',
  '쉬기 좋은 곳',
  '카페',
  '식당',
  '데이트',
  '문화적인 경험',
  '경험',
  '장소',
  '행사',
  '이벤트',
  '쇼핑',
  '음식점',
  '구경거리',
  '레스토랑',
  '맛집',
  '전시',
  '체험',
  '활동',
  '프로그램',
];

export const renderTextWithAnimation = (text: string) => {
  const parts: Array<{ text: string; isImportant: boolean }> = [];
  let lastIndex = 0;

  const matches: Array<{ start: number; end: number; keyword: string }> = [];
  
  for (const keyword of importantKeywords) {
    let searchIndex = 0;
    while (true) {
      const index = text.indexOf(keyword, searchIndex);
      if (index === -1) break;
      matches.push({ start: index, end: index + keyword.length, keyword });
      searchIndex = index + 1;
    }
  }

  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });

  const nonOverlappingMatches: Array<{ start: number; end: number; keyword: string }> = [];
  for (const match of matches) {
    const overlaps = nonOverlappingMatches.some(
      existing => !(match.end <= existing.start || match.start >= existing.end)
    );
    if (!overlaps) {
      nonOverlappingMatches.push(match);
    }
  }

  nonOverlappingMatches.sort((a, b) => a.start - b.start);

  for (const match of nonOverlappingMatches) {
    if (match.start > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.start), isImportant: false });
    }
    parts.push({ text: text.substring(match.start, match.end), isImportant: true });
    lastIndex = match.end;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isImportant: false });
  }

  if (parts.length === 0) {
    parts.push({ text, isImportant: false });
  }

  return parts.map((part, index) => {
    if (part.isImportant) {
      return (
        <LetterColorAnimation
          key={index}
          text={part.text}
          duration={6}
          style={{
            display: 'inline-block',
          }}
        />
      );
    }
    return <span key={index}>{part.text}</span>;
  });
};

