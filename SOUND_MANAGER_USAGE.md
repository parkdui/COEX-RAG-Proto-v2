# Sound Manager 사용 가이드

## 개요

SFX 폴더의 사운드 파일들을 관리하고 재생하기 위한 Sound Manager 시스템입니다.

## 파일 구조

- `src/lib/soundManager.ts`: SoundManager 클래스 (핵심 로직)
- `src/hooks/useSoundManager.ts`: React 훅 (컴포넌트에서 사용)
- `src/components/SoundManagerProvider.tsx`: Provider 컴포넌트 (앱 레벨 설정)

## 사용 방법

### 1. 기본 사용법

#### 컴포넌트에서 직접 사용

```tsx
import { useSoundManager } from '@/hooks/useSoundManager';
import { SOUND_PATHS } from '@/lib/soundManager';

function MyComponent() {
  const { playSound } = useSoundManager(['CLICK_1', 'TEXT_CHANGE']);

  const handleClick = async () => {
    await playSound('CLICK_1', { volume: 0.7 });
  };

  return <button onClick={handleClick}>Click</button>;
}
```

#### 앱 레벨에서 Provider 사용 (권장)

```tsx
// app/layout.tsx 또는 AppFlow.tsx
import SoundManagerProvider from '@/components/SoundManagerProvider';

export default function AppFlow() {
  return (
    <SoundManagerProvider preloadKeys={['CLICK_1', 'TEXT_CHANGE', 'SCREEN_TRANSITION']}>
      {/* 나머지 앱 컴포넌트 */}
    </SoundManagerProvider>
  );
}
```

### 2. 각 페이지/Scene에서 사용하기

#### LandingPage에서 사용 예시

```tsx
'use client';

import { useSoundManager } from '@/hooks/useSoundManager';
import { useEffect } from 'react';

export default function LandingPageV2() {
  const { playSound } = useSoundManager(['FIRST_APPEARANCE', 'TEXT_CHANGE', 'MENU_SELECTION']);

  // 첫 등장 사운드
  useEffect(() => {
    playSound('FIRST_APPEARANCE');
  }, []);

  // 텍스트 변경 시 사운드
  const handleTextChange = () => {
    playSound('TEXT_CHANGE');
  };

  // 메뉴 선택 시 사운드
  const handleMenuClick = (option: string) => {
    playSound('MENU_SELECTION');
  };

  return (
    // ... 컴포넌트 내용
  );
}
```

#### MainPage에서 사용 예시

```tsx
'use client';

import { useSoundManager } from '@/hooks/useSoundManager';

export default function MainPageV1() {
  const { playSound, stopAllSounds } = useSoundManager([
    'CLICK_1',
    'SCREEN_TRANSITION',
    'THINKING_LONG',
    'THINKING_SHORT',
    'MODAL_APPEARANCE',
  ]);

  // 클릭 사운드
  const handleButtonClick = () => {
    playSound('CLICK_1', { volume: 0.8 });
  };

  // 화면 전환 사운드
  const handleScreenTransition = () => {
    playSound('SCREEN_TRANSITION');
  };

  // 생각 사운드 (반복 재생)
  const handleThinkingStart = () => {
    playSound('THINKING_SHORT', { loop: true, volume: 0.6 });
  };

  const handleThinkingEnd = () => {
    stopAllSounds('THINKING_SHORT');
  };

  // 모달 등장 사운드
  const handleModalOpen = () => {
    playSound('MODAL_APPEARANCE');
  };

  return (
    // ... 컴포넌트 내용
  );
}
```

### 3. 사운드 키 목록

사용 가능한 사운드 키들:

- `FIRST_APPEARANCE`: 첫 등장 사운드 (1-1.wav)
- `FIRST_APPEARANCE_WITH_TEXT_CHANGE`: 첫 등장 + 텍스트 변경 (1-2)
- `TEXT_CHANGE`: 텍스트 변경 사운드 (2-1)
- `MENU_SELECTION`: 메뉴 선택 사운드 (2-2)
- `CLICK_1`: 클릭 사운드 1 (3-1)
- `SCREEN_TRANSITION`: 화면 전환 사운드 (3-2)
- `CLICK_2`: 클릭 사운드 2 (3-3)
- `THINKING_LONG`: 이솔 생각 사운드 (긴 버전) (4-1)
- `THINKING_SHORT`: 이솔 생각 사운드 (짧은 버전) (4-2)
- `MODAL_APPEARANCE`: 모달 등장 사운드 (5)

### 4. 고급 사용법

#### 볼륨 조절

```tsx
const { setGlobalVolume, getGlobalVolume } = useSoundManager();

// 전역 볼륨 설정 (0.0 ~ 1.0)
setGlobalVolume(0.5);

// 현재 볼륨 확인
const currentVolume = getGlobalVolume();
```

#### 음소거

```tsx
const { setMuted, isMuted } = useSoundManager();

// 음소거
setMuted(true);

// 음소거 해제
setMuted(false);

// 음소거 상태 확인
const muted = isMuted();
```

#### 사운드 재생 상태 확인

```tsx
const { isPlaying } = useSoundManager();

if (isPlaying('THINKING_SHORT')) {
  console.log('생각 사운드가 재생 중입니다');
}
```

#### 특정 사운드 중지

```tsx
const { playSound, stopSound, stopAllSounds } = useSoundManager();

// 사운드 재생하고 인스턴스 ID 저장
const instanceId = await playSound('THINKING_SHORT', { loop: true });

// 특정 인스턴스 중지
stopSound(instanceId);

// 또는 특정 키의 모든 사운드 중지
stopAllSounds('THINKING_SHORT');
```

#### 재생 완료 콜백

```tsx
const { playSound } = useSoundManager();

playSound('MODAL_APPEARANCE', {
  volume: 0.8,
  onEnded: () => {
    console.log('모달 사운드 재생 완료');
    // 다음 작업 수행
  },
  onError: (error) => {
    console.error('사운드 재생 실패:', error);
  },
});
```

### 5. 각 Scene별 추천 사용법

#### LandingPage Scene
- **첫 로고 등장**: `FIRST_APPEARANCE`
- **텍스트 변경**: `TEXT_CHANGE` 또는 `FIRST_APPEARANCE_WITH_TEXT_CHANGE`
- **버튼 표시**: `MENU_SELECTION`
- **버튼 클릭**: `CLICK_1` 또는 `CLICK_2`

#### MainPage Scene
- **화면 전환**: `SCREEN_TRANSITION`
- **버튼 클릭**: `CLICK_1` 또는 `CLICK_2`
- **생각 중 (ThinkingBlob)**: `THINKING_SHORT` (loop: true)
- **모달 열기**: `MODAL_APPEARANCE`
- **텍스트 타이핑 시작**: `TEXT_CHANGE`

#### OnboardingPage Scene
- **화면 전환**: `SCREEN_TRANSITION`
- **선택지 클릭**: `CLICK_1`

### 6. 성능 최적화 팁

1. **사전 로드**: 자주 사용하는 사운드는 컴포넌트 마운트 시 미리 로드
   ```tsx
   useSoundManager(['CLICK_1', 'TEXT_CHANGE', 'SCREEN_TRANSITION']);
   ```

2. **필요할 때만 로드**: 드물게 사용하는 사운드는 필요할 때 로드
   ```tsx
   const { playSound } = useSoundManager();
   // playSound 호출 시 자동으로 로드됨
   ```

3. **반복 재생 사운드는 중지 관리**: loop 옵션 사용 시 적절히 중지
   ```tsx
   const { playSound, stopAllSounds } = useSoundManager();
   
   useEffect(() => {
     playSound('THINKING_SHORT', { loop: true });
     return () => stopAllSounds('THINKING_SHORT');
   }, []);
   ```

### 7. 트러블슈팅

#### 사운드가 재생되지 않는 경우
- 브라우저의 자동 재생 정책으로 인해 사용자 인터랙션 후에만 재생 가능할 수 있습니다.
- `playSound`를 사용자 이벤트 핸들러 내에서 호출하세요.

#### 사운드가 겹쳐서 재생되는 경우
- `stopAllSounds`로 이전 사운드를 중지한 후 새 사운드를 재생하세요.

#### 메모리 사용량이 높은 경우
- 사용하지 않는 사운드는 자동으로 정리되지만, 필요시 `stopAll()`을 호출하여 모든 사운드를 중지할 수 있습니다.
