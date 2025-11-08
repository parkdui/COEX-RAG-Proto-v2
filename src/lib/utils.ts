// 유틸리티 함수들
export const getEnv = (k: string, d = "") => {
  const v = process.env[k];
  if (!v) return d;
  // private key의 \n을 실제 개행 문자로 변환
  if (k === "GOOGLE_PRIVATE_KEY") {
    return v.replace(/\\n/g, "\n");
  }
  return String(v).split("#")[0].trim();
};

// 코사인 유사도 계산
export function cosineSim(a: number[], b: number[]) {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// 이모지 제거 함수
export function removeEmojiLikeExpressions(text: string) {
  if (typeof text !== "string") return "";
  return (
    text
      // 이모지 제거 (유니코드 속성 사용)
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
      // ㅎㅎ, ㅋㅋ, ㅠㅠ, ^^, ^^;;, ;; 등 반복 감정 표현 제거
      .replace(/([ㅎㅋㅠ]+|[\^]+|;{2,})/g, "")
      // 여러 번 반복된 공백을 하나로 정리
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

// 컬럼 별칭 정의
export const FIELD_ALIASES = {
  category: ["행사분류", "행사구분"],
  industry: [
    "행사분야",
    "산업군",
    "산업분야",
    "카테고리",
    "분야",
    "industry",
    "Category",
  ],
  title: ["행사명"],
  subtitle: ["행사명(서브타이틀)"],
  date: ["행사 시작일자", "날짜", "기간", "개최기간", "전시기간", "date"],
  endDate: ["행사 종료일자"],
  venue: ["행사 장소", "장소", "전시장", "개최장소", "Hall", "venue"],
  price: ["입장료"],
  host: ["주최"],
  manage: ["주관"],
  inquiry: ["담당자/공연문의 정보", "단체문의 정보", "예매문의 정보"],
  site: ["관련 사이트"],
  ticket: ["티켓 예약"],
  age: ["추천 연령대", "연령대", "나이"],
  gender: ["성별"],
  interest: ["관심사"],
  job: ["직업"],
  thumbnail: ["썸네일", "Thumbnail", "이미지", "Image URL", "이미지URL"],
};

export function pickByAliases(row: Record<string, unknown>, aliases: string[]) {
  // 1) 정확 매칭
  for (const k of aliases) {
    const v = row[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  // 2) 느슨 매칭(공백 제거 후 포함 관계)
  const keys = Object.keys(row);
  for (const k of keys) {
    const nk = k.replace(/\s+/g, "");
    const hit = aliases.find((a) => nk.includes(String(a).replace(/\s+/g, "")));
    if (hit) {
      const v = row[k];
      if (v && String(v).trim()) return String(v).trim();
    }
  }
  return "";
}

export function mapRow(r: Record<string, unknown>) {
  const category = pickByAliases(r, FIELD_ALIASES.category);
  const industry = pickByAliases(r, FIELD_ALIASES.industry);
  const title = pickByAliases(r, FIELD_ALIASES.title);
  const subtitle = pickByAliases(r, FIELD_ALIASES.subtitle);
  const startDate = pickByAliases(r, FIELD_ALIASES.date);
  const endDate = pickByAliases(r, FIELD_ALIASES.endDate);
  const venue = pickByAliases(r, FIELD_ALIASES.venue);
  const price = pickByAliases(r, FIELD_ALIASES.price);
  const host = pickByAliases(r, FIELD_ALIASES.host);
  const manage = pickByAliases(r, FIELD_ALIASES.manage);
  const inquiry = pickByAliases(r, FIELD_ALIASES.inquiry);
  const site = pickByAliases(r, FIELD_ALIASES.site);
  const ticket = pickByAliases(r, FIELD_ALIASES.ticket);
  const age = pickByAliases(r, FIELD_ALIASES.age);
  const gender = pickByAliases(r, FIELD_ALIASES.gender);
  const interest = pickByAliases(r, FIELD_ALIASES.interest);
  const job = pickByAliases(r, FIELD_ALIASES.job);
  const thumbnail = pickByAliases(r, FIELD_ALIASES.thumbnail);

  // 시작일과 종료일을 하나의 날짜 문자열로 조합
  let date = startDate;
  if (startDate && endDate && startDate !== endDate) {
    date = `${startDate} ~ ${endDate}`;
  }

  // 제목과 부제를 합침
  const fullTitle = subtitle ? `${title} (${subtitle})` : title;

  // 추출한 모든 정보를 조합하여 임베딩에 사용할 baseText를 만듦
  const baseText = [
    fullTitle,
    category && `분류/구분:${category}`,
    industry && `행사분야:${industry}`,
    date && `기간:${date}`,
    venue && `장소:${venue}`,
    price && `입장료:${price}`,
    age && `추천연령:${age}`,
    gender && `성별:${gender}`,
    interest && `관심사:${interest}`,
    job && `직업:${job}`,
    host && `주최:${host}`,
    manage && `주관:${manage}`,
    inquiry && `문의:${inquiry}`,
    site && `웹사이트:${site}`,
    ticket && `티켓 예약:${ticket}`,
  ]
    .filter(Boolean)
    .join(" / ");

  return {
    category,
    industry,
    title,
    subtitle,
    date,
    venue,
    price,
    host,
    manage,
    inquiry,
    site,
    ticket,
    age,
    gender,
    interest,
    job,
    thumbnail,
    baseText,
  };
}

// 숫자를 Excel 열 문자로 변환하는 헬퍼 함수
export function columnIndexToLetter(index: number) {
  let temp,
    letter = "";
  while (index >= 0) {
    temp = index % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}
