/**
 * 카테고리별 이미지 매핑 유틸리티
 * 
 * 사용 방법:
 * 1. public/category-images/ 폴더에 카테고리별 이미지 파일을 저장하세요
 * 2. 아래 CATEGORY_IMAGE_MAP에 카테고리와 이미지 경로를 매핑하세요
 * 3. 이미지 파일명 예시:
 *    - 음식점.png 또는 음식점.jpg
 *    - 카페.png 또는 카페.jpg
 *    - 옷가게.png 등
 */

import { QuestionCategory } from '@/types';

/**
 * 카테고리별 이미지 경로 매핑
 * public 폴더 기준 경로를 사용합니다 (예: /category-images/음식점.png)
 */
export const CATEGORY_IMAGE_MAP: Record<NonNullable<QuestionCategory>, string> = {
  '음식점': '/category-images/음식점.png',
  '카페': '/category-images/카페.png',
  '옷가게': '/category-images/옷가게.png',
  '엑티비티': '/category-images/엑티비티.png',
  '휴식': '/category-images/휴식.png',
  '관람': '/category-images/관람.png',
  '컨퍼런스': '/category-images/컨퍼런스.png',
  '행사/이벤트': '/category-images/행사-이벤트.png',
  '전시': '/category-images/전시.png',
  '편의 시설': '/category-images/편의시설.png',
};

/**
 * 카테고리에 해당하는 이미지 경로를 반환합니다
 * @param category 질문 카테고리
 * @returns 이미지 경로 (없으면 null)
 */
export function getCategoryImage(category: QuestionCategory | null | undefined): string | null {
  if (!category) {
    return null;
  }
  return CATEGORY_IMAGE_MAP[category] || null;
}

/**
 * 카테고리 이미지가 존재하는지 확인합니다
 * @param category 질문 카테고리
 * @returns 이미지 경로가 있으면 true
 */
export function hasCategoryImage(category: QuestionCategory | null | undefined): boolean {
  return getCategoryImage(category) !== null;
}
