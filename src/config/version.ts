/**
 * 프론트엔드 버전 관리 설정
 */

export type Version = 'v1' | 'v2' | 'v3';

export interface VersionConfig {
  id: Version;
  name: string;
  description: string;
  isActive: boolean;
  features: string[];
}

export const VERSION_CONFIGS: Record<Version, VersionConfig> = {
  v1: {
    id: 'v1',
    name: 'Basic Version',
    description: '기본적인 채팅 인터페이스',
    isActive: false,
    features: [
      '기본 채팅 UI',
      '텍스트 입력',
      '음성 입력',
      'TTS 재생'
    ]
  },
  v2: {
    id: 'v2',
    name: 'Enhanced Version',
    description: '향상된 UI/UX와 추가 기능',
    isActive: true,
    features: [
      '모던한 UI 디자인',
      '애니메이션 효과',
      '반응형 레이아웃',
      '향상된 음성 인터페이스',
      '실시간 상태 표시'
    ]
  },
  v3: {
    id: 'v3',
    name: 'Advanced Version',
    description: '고급 기능과 최적화',
    isActive: true,
    features: [
      '다크/라이트 모드',
      '키보드 단축키',
      '향상된 애니메이션',
      '성능 최적화',
      '고급 UI/UX'
    ]
  }
};

export const DEFAULT_VERSION: Version = 'v2';

/**
 * 현재 활성화된 버전을 가져옵니다
 */
export function getActiveVersion(): Version {
  const stored = localStorage.getItem('coex-ui-version') as Version;
  return stored && VERSION_CONFIGS[stored] ? stored : DEFAULT_VERSION;
}

/**
 * 버전을 설정합니다
 */
export function setActiveVersion(version: Version): void {
  localStorage.setItem('coex-ui-version', version);
}

/**
 * 사용 가능한 모든 버전을 가져옵니다
 */
export function getAvailableVersions(): VersionConfig[] {
  return Object.values(VERSION_CONFIGS);
}
