# Input Token 사용량 감소 작업 요약

## ✅ 적용 완료된 최적화

### 1. maxTokens 조정
- **변경**: 700 → 70 tokens
- **효과**: Output token 예약 감소 (Input에는 직접적 영향 없음)

### 2. History 제한
- **변경**: 무제한 → 최근 2턴만
- **효과**: ~2,400 tokens 절감 (6번째 질문 시)

### 3. 비정보성 질문 History 필터링
- **변경**: RAG context 제거
- **효과**: ~2,400 tokens 절감 (3번의 비정보성 질문)

### 4. RAG Context 압축 (방금 적용)
- **TOP_K**: 3 → 2
- **텍스트 길이 제한**: 200자
- **효과**: ~500-600 tokens 절감 (3번의 정보성 질문)

---

## 📊 최적화 전후 비교

### 최적화 전
- System Prompt: ~3,580 tokens × 6 = 21,480 tokens
- History (무제한): ~3,200 tokens
- RAG Context: ~800 tokens × 3 = 2,400 tokens
- **총 Input**: ~27,080 tokens

### 최적화 후
- System Prompt: ~3,580 tokens × 6 = 21,480 tokens (변화 없음)
- History (최근 2턴): ~800 tokens
- RAG Context (압축): ~400 tokens × 3 = 1,200 tokens
- **총 Input**: ~23,480 tokens
- **절감: ~3,600 tokens (13% 감소)**

---

## 🎯 추가 Input Token 절감 방안

### 방안 1: System Prompt 최적화 (가장 효과적) ⭐⭐⭐

**현재 문제:**
- System Prompt가 6,424 bytes ≈ ~3,500 tokens
- 매 질문마다 반복 포함
- 6번 × 3,500 = 21,000 tokens (전체의 90%)

**최적화 방법:**
1. 예시 대화 제거 (가장 큰 부분)
2. 불필요한 설명 간소화
3. 핵심 규칙만 유지

**예상 효과:**
- ~3,500 tokens → ~2,000 tokens
- 6번 × 1,500 tokens 절감 = **9,000 tokens 절감**
- **전체 Input의 38% 감소**

### 방안 2: System Prompt 캐싱 (고급)

**방법:**
- System Prompt를 한 번만 로드하고 재사용
- 하지만 Next.js API Routes에서는 매 요청마다 새로 로드됨
- **현재 구조에서는 적용 어려움**

### 방안 3: 날짜 정보 최적화

**현재:**
```typescript
const currentDateInfo = `\n\n[현재 날짜 정보]\n현재 날짜는 ${year}년 ${month}월 ${day}일(${weekday}요일)이다. 지나간 날짜의 이벤트는 추천하지 않아야 한다.\n`;
```

**최적화:**
```typescript
const currentDateInfo = `\n\n[날짜] ${year}-${month}-${day} (${weekday}). 지나간 날짜 이벤트 추천 금지.\n`;
```

**효과:**
- ~50 tokens → ~20 tokens
- 6번 × 30 tokens = **180 tokens 절감**

### 방안 4: 응답 형식 규칙 간소화

**현재:**
```typescript
const headlineConstraint = "\n\n[응답 형식 규칙]\n응답의 첫 번째 문장(또는 첫 번째 문단)은 모바일 화면에서 최대 2줄로 표시될 수 있도록 작성해야 합니다. 한 줄은 약 12자 정도로 계산하여, 첫 번째 문장은 약 24자 이내로 작성하되, 문장이 자연스럽게 끝맺음되도록 해주세요.";
```

**최적화:**
```typescript
const headlineConstraint = "\n\n[응답 형식] 첫 문장은 24자 이내로 작성.\n";
```

**효과:**
- ~30 tokens → ~10 tokens
- 6번 × 20 tokens = **120 tokens 절감**

---

## 💡 즉시 적용 가능한 추가 최적화

### 1. 날짜 정보 간소화
```typescript
// 현재: ~50 tokens
// 최적화: ~20 tokens
// 절감: 180 tokens
```

### 2. 응답 형식 규칙 간소화
```typescript
// 현재: ~30 tokens
// 최적화: ~10 tokens
// 절감: 120 tokens
```

### 3. System Prompt 예시 대화 제거
```typescript
// 예시 대화 2개 제거
// 절감: ~1,500 tokens × 6 = 9,000 tokens
```

**총 추가 절감 가능: ~9,300 tokens**

---

## 📈 최종 예상 효과

### 현재 (최적화 적용 후)
- Input: ~23,480 tokens

### 추가 최적화 후
- Input: ~14,180 tokens
- **절감: 9,300 tokens (40% 추가 감소)**

### 전체 최적화 전후 비교
- **최적화 전**: ~27,080 tokens
- **최적화 후**: ~14,180 tokens
- **총 절감: 12,900 tokens (48% 감소)**

---

## ✅ 결론

**적용 완료:**
1. ✅ maxTokens: 700 → 70
2. ✅ History 제한: 최근 2턴만
3. ✅ 비정보성 질문 History 필터링
4. ✅ RAG Context 압축: TOP_K 3→2, 텍스트 200자 제한

**추가 권장:**
1. System Prompt 최적화 (가장 효과적)
2. 날짜 정보 간소화
3. 응답 형식 규칙 간소화

**현재 Input Token 절감: ~3,600 tokens (13%)**
**추가 최적화 시: ~9,300 tokens 더 절감 가능 (총 48% 감소)**

