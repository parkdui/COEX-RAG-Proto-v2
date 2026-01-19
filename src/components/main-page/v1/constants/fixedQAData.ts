// =======================
// CHIP 설정
// =======================
export const CHIP_VARIANTS = {
  couple: { label: "연인과 둘이", sentence: "연인과 둘이" },
  friend: { label: "친구랑 같이", sentence: "친구랑 같이" },
  family: { label: "가족과 함께", sentence: "가족과 함께" },
  solo: { label: "혼자서 자유롭게", sentence: "혼자" },
};

// OnboardingPage 옵션을 CHIP_VARIANTS 키로 매핑
export const ONBOARDING_TO_CHIP_MAP: Record<string, keyof typeof CHIP_VARIANTS> = {
  '연인과 둘이': 'couple',
  '친구랑 같이': 'friend',
  '가족과 함께': 'family',
  '혼자서 자유롭게': 'solo',
};

// 각 chipKey별 paraphrasing 옵션 (topicId 기반으로 순환 선택)
// 주의: "{chip}라면" 패턴에 자연스럽게 들어갈 수 있는 표현만 사용
export const CHIP_PARAPHRASING: Record<keyof typeof CHIP_VARIANTS, string[]> = {
  solo: ['혼자', '혼자서', '홀로'],
  couple: ['둘이', '단둘이', '둘이서', '다같이'],
  friend: ['같이', '다같이', '함께', '친구끼리'],
  family: ['가족끼리', '다같이', '함께', '다함께'],
};

export interface FixedAnswer {
  text: string;
  image?: string; // 기존 호환성을 위해 선택적
  url?: string; // 사이트 바로가기 URL
  keywords?: string[];
  linkText?: string;
}

export interface FixedQA {
  topicId: string;
  questionTemplate: string;
  thinkingText?: string;
  answers: Array<{
    textTemplate: string;
    keywords?: string[];
    linkText?: string;
    url?: string;
    image?: string; // 기존 호환성을 위해 선택적
  }>;
  soloTextTemplates?: string[];
}

// =======================
// QA 데이터 (최종 10개) - 정리본
// =======================
export const fixedQAData: FixedQA[] = [
  // 1. 식당
  {
    topicId: "restaurant",
    questionTemplate: "{chip} 가기 좋은 식당을 추천해줘",
    thinkingText: "{chip} 가기 좋은 식당을 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 'Hotcho'를 추천해요. 함께 나누어 먹기 좋은 오코노미야키가 시그니처인, 핫한 식당이랍니다!",
        keywords: ["Hotcho", "오코노미야키", "식당", "모임"],
        linkText: "Hotcho 위치 보기",
        url: "https://map.naver.com/p/entry/place/1674380367",
        image: "/QA_Imgs/1-1.png",
      },
      {
        textTemplate:
          "{chip}라면 트랜디한 분위기의 '캘리포니아피자키친'을 추천드려요. 여유롭게 식사하며 이야기 나누기 좋아요.",
        keywords: ["캘리포니아피자키친", "피자", "리조토", "트렌디"],
        linkText: "캘리포니아피자키친 위치 보기",
        url: "https://map.naver.com/p/entry/place/37471418",
        image: "/QA_Imgs/1-2.png",
      },
    ],
    soloTextTemplates: [
      "{chip}라면 'Hotcho'를 추천해요.\n\n트랜디한 일식당으로, 혼자서도\n오코노미야끼를 즐기기에도 좋아요!",
      "캘리포니아피자키친을 추천드려요!\n\n넓고 쾌적한 공간에서 여유롭게\n양식으로 혼밥하기 좋은 공간이에요!",
    ],
  },

  // 2. 구경
  {
    topicId: "date",
    questionTemplate: "{chip} 구경하기 좋은 곳을 추천해줘",
    thinkingText: "{chip} 구경하기 좋은 곳을 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 '메가박스'를 추천드려요. 조용히 앉아 영화에 몰입하고, 영화에 대해\n이야기를 나누기 좋을 것입니다!",
        keywords: ["메가박스", "영화", "데이트"],
        linkText: "메가박스 정보 보기",
        url: "https://map.naver.com/p/entry/place/12307868?c=15.00,0,0,0,dh",
        image: "/QA_Imgs/3-1.png",
      },
      {
        textTemplate:
          "{chip}라면 '아쿠아리움'을 추천해요. 테마별 전시관과 신비한 수중 공연이 펼쳐져, 모두에게 특별한 경험이 될 거예요!",
        keywords: ["아쿠아리움", "실내", "데이트"],
        linkText: "아쿠아리움 정보 보기",
        url: "https://map.naver.com/p/entry/place/11606845",
        image: "/QA_Imgs/3-2.png",
      },
    ],
    soloTextTemplates: [
      "혼자 즐기기 좋은 메가박스!\n\n쾌적한 곳에서 오롯이 영화에 몰입하기 좋아요.",
      "혼자 천천히 걸어다니며 관람하기 좋아요.",
    ],
  },

  // 3. KPOP 관련 장소
  {
    topicId: "kpop",
    questionTemplate: "{chip} 가기 좋은 KPOP 관련 구경거리를 추천해줘",
    thinkingText: "{chip} 가기 좋은 KPOP 관련 구경거리를 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 K-POP을 즐기기 좋은 '케이타운포유(Ktown4u)'를 추천드려요. 앨범과 굿즈를 구경할 수 있고, 팝업 스토어 전시까지 즐길 수 있답니다!",
        keywords: ["케이타운포유", "실내"],
        linkText: "코엑스 케이타운포유 정보 보기",
        url: "https://naver.me/GvcTVga2",
        image: "/QA_Imgs/2-1.png",
      },
      {
        textTemplate:
          "{chip}라면 K-컬처의 에너지를 느낄 수 있는 'K-POP 광장'을 추천해요. 거대한 전광판에 나오는 아티스트 영상을 감상하며 인증샷 남기기 좋답니다!",
        keywords: ["K-POP 광장", "야외"],
        linkText: "K-POP 광장 정보 보기",
        url: "https://business.coex.co.kr/square/introduction/coex/",
        image: "/QA_Imgs/2-2.png",
      },
    ],
    soloTextTemplates: [
      "혼자 왔다면 'Ktown4u'를 추천해요\n\n혼자 천천히 앨범과 굿즈를 구경하고\nkpop을 제대로 즐기기 좋을 거에요!",
      "{chip}라면 K-컬처의 에너지를 느낄 수 있는 'K-POP 광장'을 추천해요.\n\n전광판에서 나오는 아이돌 영상도 보고\n인증샷을 남기기에도 좋아요!",
    ],
  },

  // 4. 부담 없는 휴식
  {
    topicId: "solo_play",
    questionTemplate: "{chip} 휴식하기 좋은 공간을 알고 싶어",
    thinkingText: "{chip} 휴식하기 좋은 공간을 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 '메가박스'를 추천해요. 조용히 앉아 영화에 몰입하고, 영화에 대해\n이야기를 나누기 좋을 것입니다!",
        keywords: ["메가박스", "영화", "휴식"],
        linkText: "메가박스 정보 보기",
        url: "https://naver.me/FSw7y8u8",
        image: "/QA_Imgs/5-1.png",
      },
      {
        textTemplate:
          "{chip}라면 '영풍문고'를 추천해요. 책과 문구류를 천천히 구경하며\n조용한 무드로 놀기 좋아요!",
        keywords: ["영풍문고", "서점", "휴식"],
        linkText: "영풍문고 매장 정보 보기",
        url: "https://naver.me/xZVbfno8",
        image: "/QA_Imgs/5-2.png",
      },
    ],
    soloTextTemplates: [
      "혼자 즐기기 좋은 메가박스!\n\n쾌적한 곳에서 오롯이 영화에 몰입하기 좋아요.",
      "혼자 왔다면 영풍문고는 어떠세요?\n\n책과 문구를 구경하며 쉬어가기\n좋고, 조용한 무드로 즐길 수 있어요",
    ],
  },

  // 5. 쇼핑
  {
    topicId: "shopping",
    questionTemplate: "{chip} 쇼핑하기 좋은 곳을 찾고 있어",
    thinkingText: "{chip} 쇼핑하기 좋은 곳을 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 스타필드 코엑스몰\n지하 1층을 방문해보세요. 글로벌 SPA 브랜드부터 힙한 패션까지 다양한 패션 트렌드를 경험할 수 있어요.",
        keywords: ["코엑스몰", "쇼핑"],
        linkText: "코엑스몰 층별 안내 보기",
        url: "https://naver.me/x7rxx3sd",
        image: "/QA_Imgs/6-1.png",
      },
      {
        textTemplate:
          "{chip}라면 '버터(BUTTER)'와\n'자주(JAJU)'를 추천해요. 시즌마다 변화하는 아이디어 상품들이 가득해 구경하는 재미가 쏠쏠해요!",
        keywords: ["버터", "자주", "소품"],
        linkText: "버터·자주 매장 정보 보기",
        url: "https://naver.me/GmVhBnj9",
        image: "/QA_Imgs/6-2.png",
      },
    ],
    soloTextTemplates: [
      "혼자 쇼핑하기엔 코엑스몰 지하 1층!\n\n트랜디한 옷가게가 많은 곳으로,\n오직 나만을 위한 쇼핑 시간을 즐겨보세요.",
      "{chip}라면 '버터(BUTTER)'와 '자주(JAJU)'를 추천해요.\n\n시즌마다 조금씩 달라지는 소품들을\n구경하며 하루를 보내보세요!",
    ],
  },

  // 6. 카페
  {
    topicId: "cafe",
    questionTemplate: "{chip} 갈만한 조용한 카페를 찾고 있어",
    thinkingText: "{chip} 갈만한 조용한 카페를 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 '테라로사'를 추천해요. 커피가 맛있기로 유명하고 비교적 조용한 분위기여서 담소를 나누기 좋아요.",
        keywords: ["테라로사", "카페", "작업"],
        linkText: "테라로사 매장 정보 보기",
        url: "https://naver.me/FuE5IaZn",
        image: "/QA_Imgs/7-1.png",
      },
      {
        textTemplate:
          "{chip}라면 '피어커피'를 추천해요. 좌석 배치가 여유롭고 커피 맛이 훌륭해 편하게 이야기하기 좋은 환경입니다.",
        keywords: ["피어커피", "카페", "집중"],
        linkText: "피어커피 매장 정보 보기",
        url: "https://naver.me/xdkF0sEt",
        image: "/QA_Imgs/7-2.png",
      },
    ],
    soloTextTemplates: [
      "{chip} 왔다면 '테라로사'를 추천해요.\n\n비교적 조용해서 작업이나 독서하기 좋아요.",
      "{chip} 왔다면 '피어커피'를 추천해요.\n\n혼자 방문해 집중하기 좋은 분위기예요.",
    ],
  },

  // 7. 한식당
  {
    topicId: "korean_food",
    questionTemplate: "{chip} 방문하기 좋은 한식당을 찾고 있어",
    thinkingText: "{chip} 방문하기 좋은 한식당을 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 '하동관'을 추천해요. 담백한 곰탕으로 식사하기 좋아요.",
        keywords: ["하동관", "곰탕"],
        linkText: "하동관 매장 정보 보기",
        url: "https://naver.me/GipBT6FZ",
        image: "/QA_Imgs/8-1.png",
      },
      {
        textTemplate:
          "{chip}라면 '솥내음'을 추천해요. 속 편안한 솥밥을 즐기며 식사하기 좋아요.",
        keywords: ["솥내음", "식당"],
        linkText: "솥내음 매장 정보 보기",
        url: "https://naver.me/Fy2FYvjZ",
        image: "/QA_Imgs/8-2.png",
      },
    ],
    soloTextTemplates: [
      "{chip} 왔다면 '하동관'을 추천해요.\n\n담백한 곰탕을 조용히 즐기기 좋아요.",
      "{chip} 왔다면 '솥내음'을 추천해요.\n\n혼자 속 편안한 솥밥 한 끼 하기 좋아요.",
    ],
  },

  // 8. 유명 스팟
  {
    topicId: "famous",
    questionTemplate: "{chip} 코엑스에서 가장 유명한 곳에 가고 싶어",
    thinkingText: "{chip} 코엑스에서 가장 유명한 곳을 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 '별마당 도서관'! 함께 사진 찍고 쉬어가기도 좋은 공간으로,\n시기마다 열리는 행사를 즐기기에도 좋아요",
        keywords: ["별마당 도서관"],
        linkText: "별마당 도서관 정보 보기",
        url: "https://naver.me/5E3Z4o2K",
        image: "/QA_Imgs/9-1.png",
      },
      {
        textTemplate:
          "{chip}라면 '외벽 미디어'를 추천해요. 미디어 아트와 광고 등 화려한 영상미를 감상하며 인증샷 남기기 좋아요!",
        keywords: ["외벽 미디어"],
        linkText: "외벽 미디어 위치 보기",
        url: "https://naver.me/GrqDfsRd",
        image: "/QA_Imgs/9-2.png",
      },
    ],
    soloTextTemplates: [
      "{chip}라면 '별마당 도서관'!\n\n함께 사진 찍고 쉬어가기도 좋은 공간으로,\n시기마다 열리는 행사를 즐기기에도 좋아요",
      "{chip}라면 '외벽 미디어'를 추천해요.\n\n화려한 미디어 아트를 구경하며\n셀피로 인증샷을 찍어보시는건 어때요?",
    ],
  },

  // 9. 트렌디 음식
  {
    topicId: "trendy_food",
    questionTemplate: "{chip} 분위기 있는 트렌디한 음식점을 찾고 있어",
    thinkingText: "{chip} 분위기 있는 트렌디한 음식점을 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 중식당 '무탄'을 추천해요. 트러플 짜장면 같이 SNS에서 화제가 된 독특한 메뉴들을 맛보실 수 있을 것입니다.",
        keywords: ["무탄", "중식"],
        linkText: "무탄 매장 정보 보기",
        url: "https://naver.me/Gz19jeev",
        image: "/QA_Imgs/10-1.png",
      },
      {
        textTemplate:
          "{chip}라면 '이비티(ebt)'를 추천해요. 감각적인 플레이팅과 인테리어로 트렌디한 미식 경험이 가능해요!",
        keywords: ["이비티", "ebt"],
        linkText: "이비티 매장 정보 보기",
        url: "https://naver.me/GD52RRB3",
        image: "/QA_Imgs/10-2.png",
      },
    ],
    soloTextTemplates: [
      "혼자왔다면 무탄은 어떠세요?\n\n트랜디한 퓨전 중식당으로,\n유행중인 다양한 단품요리를 즐겨보세요",
      "{chip}라면 '이비티(ebt)'를 추천해요.\n\n감각적인 플레이팅과 인테리어로 트렌디한\n단품메뉴를 즐겨보세요!",
    ],
  },

  // 10. 코엑스 주변 구경
  {
    topicId: "around_coex",
    questionTemplate: "{chip} 코엑스 주변 구경거리를 추천해줘",
    thinkingText: "{chip} 코엑스 주변 구경거리를 찾고 있어요",
    answers: [
      {
        textTemplate:
          "{chip}라면 코엑스 옆에 있는 '봉은사'를 추천해요. 도심 속 사찰에서 잠깐 여유로운 시간을 보내는 것은 어떠신가요?",
        keywords: ["봉은사", "산책", "휴식"],
        linkText: "봉은사 위치 보기",
        url: "https://map.naver.com/p/entry/place/11564024",
        image: "/QA_Imgs/11-1.png"
      },
      {
        textTemplate:
          "{chip}라면 외벽 미디어를 추천해요. 시간대마다 다른 미디어 아트와 K-POP 광고 등을 구경할 수 있어요.",
        keywords: ["미디어 파사드", "야경"],
        linkText: "미디어 파사드 위치 보기",
        url: "https://map.naver.com/p/entry/place/1149591458",
        image: "/QA_Imgs/9-2.png"
      },
    ],
    soloTextTemplates: [
      "{chip}라면 코엑스 옆에 있는 '봉은사'를 추천해요.\n\n홀로 평안함을 느끼며 여유로운\n산책을 즐기고 구경하기 좋아요",
      "혼자 왔다면 미디어 파사드를\n구경하고 오는건 어떠실까요?\n\n코엑스의 상징 중 하나로, 시간때마다\n다른 미디어 아트를 구경할 수 있어요!",
    ],
  },
];

// =======================
// 렌더링 헬퍼
// =======================
export function buildQAForChip(topic: FixedQA, chipKey: keyof typeof CHIP_VARIANTS, variationIndex?: number) {
  const chip = CHIP_VARIANTS[chipKey];

  const useSolo =
    chipKey === "solo" &&
    Array.isArray(topic.soloTextTemplates) &&
    topic.soloTextTemplates.length === topic.answers.length;

  // topicId를 기반으로 paraphrasing 선택 (각 topic마다 다른 표현 사용)
  const paraphrasingOptions = CHIP_PARAPHRASING[chipKey];
  // topicId의 해시값을 사용하여 일관된 선택 (같은 topicId는 항상 같은 paraphrasing)
  // variationIndex를 추가하여 같은 topicId를 가진 chips가 서로 다른 paraphrasing을 사용하도록 함
  const topicIndex = topic.topicId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const combinedIndex = variationIndex !== undefined ? (topicIndex + variationIndex) : topicIndex;
  const selectedParaphrasing = paraphrasingOptions[combinedIndex % paraphrasingOptions.length];

  return {
    question: topic.questionTemplate.replaceAll("{chip}", selectedParaphrasing),
    answers: topic.answers.map((a, i) => ({
      text: (useSolo ? topic.soloTextTemplates![i] : a.textTemplate).replaceAll(
        "{chip}",
        selectedParaphrasing
      ),
      keywords: a.keywords,
      linkText: a.linkText,
      url: a.url,
      image: a.image,
    })),
  };
}

// 선택된 OnboardingPage 옵션에 따라 질문들을 가져오는 헬퍼 함수
export function getQuestionsForOption(option: string | null): Array<{ question: string; topic: FixedQA; chipKey: keyof typeof CHIP_VARIANTS }> {
  if (!option) {
    // 옵션이 없으면 모든 질문 반환 (기본값)
    return fixedQAData.flatMap(topic => 
      Object.keys(CHIP_VARIANTS).map(chipKey => ({
        question: buildQAForChip(topic, chipKey as keyof typeof CHIP_VARIANTS).question,
        topic,
        chipKey: chipKey as keyof typeof CHIP_VARIANTS,
      }))
    );
  }

  const chipKey = ONBOARDING_TO_CHIP_MAP[option];
  if (!chipKey) {
    return [];
  }

  // 각 topic마다 다른 variationIndex를 사용하여 서로 다른 paraphrasing을 선택하도록 함
  return fixedQAData.map((topic, index) => ({
    question: buildQAForChip(topic, chipKey, index).question,
    topic,
    chipKey,
  }));
}

// 질문 텍스트로부터 해당 QA를 찾는 헬퍼 함수
export function findQAByQuestion(questionText: string, option: string | null): { topic: FixedQA; chipKey: keyof typeof CHIP_VARIANTS; qa: ReturnType<typeof buildQAForChip> } | null {
  if (!option) {
    // 옵션이 없으면 모든 chipKey로 검색
    for (const topic of fixedQAData) {
      for (const chipKey of Object.keys(CHIP_VARIANTS) as Array<keyof typeof CHIP_VARIANTS>) {
        // 모든 variationIndex를 시도하여 매칭
        for (let variationIndex = 0; variationIndex < 10; variationIndex++) {
          const qa = buildQAForChip(topic, chipKey, variationIndex);
          if (qa.question === questionText) {
            return { topic, chipKey, qa };
          }
        }
      }
    }
    return null;
  }

  const chipKey = ONBOARDING_TO_CHIP_MAP[option];
  if (!chipKey) {
    return null;
  }

  for (const topic of fixedQAData) {
    // 모든 variationIndex를 시도하여 매칭
    for (let variationIndex = 0; variationIndex < 10; variationIndex++) {
      const qa = buildQAForChip(topic, chipKey, variationIndex);
      if (qa.question === questionText) {
        return { topic, chipKey, qa };
      }
    }
  }

  return null;
}

// 질문 텍스트에서 사용된 paraphrasingOptions를 추출하는 헬퍼 함수
export function extractParaphrasingFromQuestion(questionText: string, questionTemplate: string, chipKey: keyof typeof CHIP_VARIANTS): string | null {
  // questionTemplate에서 {chip} 위치 찾기
  const chipPlaceholder = "{chip}";
  const chipIndex = questionTemplate.indexOf(chipPlaceholder);
  if (chipIndex === -1) {
    return null;
  }

  // questionTemplate에서 {chip} 앞부분과 뒷부분 추출
  const beforeChip = questionTemplate.substring(0, chipIndex);
  const afterChip = questionTemplate.substring(chipIndex + chipPlaceholder.length);
  
  // questionText에서 beforeChip과 afterChip 사이의 텍스트 추출 (paraphrasingOptions)
  const beforeIndex = questionText.indexOf(beforeChip);
  const afterIndex = questionText.indexOf(afterChip, beforeIndex + beforeChip.length);
  
  if (beforeIndex === -1 || afterIndex === -1) {
    return null;
  }
  
  const extracted = questionText.substring(beforeIndex + beforeChip.length, afterIndex);
  
  // 추출된 텍스트가 CHIP_PARAPHRASING에 있는지 확인
  const paraphrasingOptions = CHIP_PARAPHRASING[chipKey];
  if (paraphrasingOptions.includes(extracted)) {
    return extracted;
  }
  
  return null;
}
