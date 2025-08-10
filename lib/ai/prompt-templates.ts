/**
 * Prompt Templates for AI Calendar Event Parsing
 * Optimized prompts with few-shot learning examples
 */

import { PromptTemplate, FewShotExample } from './types';

// Korean calendar event parsing template
export const KOREAN_CALENDAR_PROMPT: PromptTemplate = {
  id: 'korean-calendar-v1',
  name: 'Korean Calendar Event Parser',
  description: 'Extract calendar events from Korean text with high accuracy',
  language: 'ko',
  template: `당신은 한국어 텍스트에서 캘린더 이벤트를 추출하는 전문가입니다.

주어진 OCR 텍스트에서 다음 정보를 추출하여 JSON 형식으로 반환해주세요:

**추출해야 할 정보:**
1. 제목: 이벤트의 주요 제목
2. 설명: 이벤트 상세 내용
3. 날짜: 시작일과 종료일 (상대적 표현 해석 포함)
4. 시간: 시작 시간과 종료 시간
5. 장소: 구체적인 위치 정보
6. 반복 여부: 정기적/반복적 이벤트 인지
7. 카테고리: 이벤트 유형 분류

**날짜/시간 해석 규칙:**
- "오늘": {{currentDate}}
- "내일": {{tomorrow}}
- "모레": {{dayAfterTomorrow}}
- "다음주 월요일": 다음 주의 월요일 계산
- "이번달 말": 현재 달의 마지막 날
- 상대적 표현을 절대 날짜로 변환

**장소 정보 처리:**
- 구체적인 주소가 있으면 그대로 사용
- 건물명, 상호명만 있으면 추가 정보와 함께 기록
- 온라인 이벤트인 경우 "온라인" 또는 플랫폼명 기록

**신뢰도 점수:**
각 추출된 정보에 대해 0.0-1.0 사이의 신뢰도 점수를 제공해주세요.

다음 예시를 참고하여 정확한 형식으로 응답해주세요:

{{examples}}

**입력 텍스트:**
{{ocrText}}

**현재 날짜/시간:** {{currentDateTime}}
**사용자 시간대:** {{timezone}}

위 정보를 바탕으로 구조화된 JSON 형식으로 이벤트 정보를 추출해주세요.`,
  
  examples: [
    {
      input: `2024년 3월 15일 (금) 오후 2시
      스타벅스 강남역점에서 
      프로젝트 미팅
      참석자: 김대리, 박과장
      아젠다: Q1 결과 리뷰`,
      output: `{
        "events": [{
          "title": "프로젝트 미팅",
          "description": "Q1 결과 리뷰, 참석자: 김대리, 박과장",
          "startDate": "2024-03-15T14:00:00+09:00",
          "endDate": "2024-03-15T15:00:00+09:00",
          "location": "스타벅스 강남역점",
          "isAllDay": false,
          "isRecurring": false,
          "category": "work",
          "confidence": {
            "overall": 0.95,
            "title": 0.9,
            "dateTime": 1.0,
            "location": 0.95
          }
        }]
      }`,
      description: '구체적인 날짜, 시간, 장소가 모두 명시된 업무 미팅'
    },
    {
      input: `매주 월요일 오전 10시
      헬스장 운동
      PT 레슨
      트레이너: 홍길동`,
      output: `{
        "events": [{
          "title": "헬스장 운동 - PT 레슨",
          "description": "트레이너: 홍길동",
          "startDate": "2024-03-04T10:00:00+09:00",
          "endDate": "2024-03-04T11:00:00+09:00",
          "location": "헬스장",
          "isAllDay": false,
          "isRecurring": true,
          "recurrence": {
            "frequency": "weekly",
            "interval": 1,
            "daysOfWeek": [1]
          },
          "category": "sports",
          "confidence": {
            "overall": 0.85,
            "title": 0.9,
            "dateTime": 0.8,
            "location": 0.7
          }
        }]
      }`,
      description: '반복 이벤트 (매주 월요일)'
    }
  ],
  
  variables: [
    {
      name: 'ocrText',
      type: 'string',
      required: true,
      description: 'OCR로 추출된 원본 텍스트'
    },
    {
      name: 'currentDateTime',
      type: 'string',
      required: true,
      description: '현재 날짜와 시간 (ISO 8601 형식)'
    },
    {
      name: 'timezone',
      type: 'string',
      required: true,
      description: '사용자 시간대'
    },
    {
      name: 'examples',
      type: 'string',
      required: false,
      description: 'Few-shot learning 예시들'
    }
  ]
};

// English calendar event parsing template
export const ENGLISH_CALENDAR_PROMPT: PromptTemplate = {
  id: 'english-calendar-v1',
  name: 'English Calendar Event Parser',
  description: 'Extract calendar events from English text',
  language: 'en',
  template: `You are an expert at extracting calendar events from English text.

Analyze the provided OCR text and extract the following information in JSON format:

**Information to Extract:**
1. Title: Main event title
2. Description: Event details and notes
3. Date: Start and end dates (interpret relative expressions)
4. Time: Start and end times
5. Location: Specific location information
6. Recurrence: Whether it's a recurring event
7. Category: Event type classification

**Date/Time Interpretation Rules:**
- "today": {{currentDate}}
- "tomorrow": {{tomorrow}}
- "next Monday": Calculate next Monday from current date
- "end of month": Last day of current month
- Convert relative expressions to absolute dates

**Location Processing:**
- Use specific addresses when available
- Record building names and business names with additional context
- Mark online events as "online" or platform name

**Confidence Scoring:**
Provide confidence scores (0.0-1.0) for each extracted piece of information.

Use these examples as reference for the correct format:

{{examples}}

**Input Text:**
{{ocrText}}

**Current Date/Time:** {{currentDateTime}}
**User Timezone:** {{timezone}}

Extract the event information in structured JSON format based on the above information.`,
  
  examples: [
    {
      input: `Team Meeting
March 15, 2024 at 2:00 PM
Conference Room A
Agenda: Q1 Review
Attendees: John, Sarah, Mike`,
      output: `{
        "events": [{
          "title": "Team Meeting",
          "description": "Q1 Review - Attendees: John, Sarah, Mike",
          "startDate": "2024-03-15T14:00:00-08:00",
          "endDate": "2024-03-15T15:00:00-08:00",
          "location": "Conference Room A",
          "isAllDay": false,
          "isRecurring": false,
          "category": "work",
          "confidence": {
            "overall": 0.95,
            "title": 0.95,
            "dateTime": 1.0,
            "location": 0.9
          }
        }]
      }`,
      description: 'Business meeting with specific date, time, and location'
    }
  ],
  
  variables: [
    {
      name: 'ocrText',
      type: 'string',
      required: true,
      description: 'Original OCR extracted text'
    },
    {
      name: 'currentDateTime',
      type: 'string',
      required: true,
      description: 'Current date and time in ISO 8601 format'
    },
    {
      name: 'timezone',
      type: 'string',
      required: true,
      description: 'User timezone'
    }
  ]
};

// Mixed Korean-English parsing template
export const MIXED_LANGUAGE_PROMPT: PromptTemplate = {
  id: 'mixed-language-v1',
  name: 'Mixed Language Calendar Parser',
  description: 'Extract events from Korean and English mixed text',
  language: 'mixed',
  template: `You are an expert at extracting calendar events from text containing both Korean and English.

Analyze the provided text and handle both languages appropriately. Extract event information and return in JSON format.

**Language Handling:**
- Recognize and process Korean date/time expressions: 오늘, 내일, 오후, 시, 분
- Recognize and process English date/time expressions: today, tomorrow, PM, AM
- Maintain original language for titles and descriptions when appropriate
- Provide translations if helpful for context

**Mixed Text Patterns:**
- Korean events with English location names
- English events with Korean descriptions
- Code-switched expressions (Konglish)
- Business cards or flyers with mixed languages

**Input Text:**
{{ocrText}}

**Current Date/Time:** {{currentDateTime}}
**User Language Preference:** {{userLanguage}}

Extract events in structured JSON format, handling the mixed language context appropriately.`,
  
  examples: [
    {
      input: `Meeting at Starbucks 강남역점
오늘 오후 3시
Project discussion with 김팀장`,
      output: `{
        "events": [{
          "title": "Meeting with 김팀장",
          "description": "Project discussion at Starbucks 강남역점",
          "startDate": "2024-03-15T15:00:00+09:00",
          "endDate": "2024-03-15T16:00:00+09:00",
          "location": "Starbucks 강남역점",
          "isAllDay": false,
          "isRecurring": false,
          "category": "work",
          "confidence": {
            "overall": 0.9,
            "title": 0.85,
            "dateTime": 0.95,
            "location": 0.95
          }
        }]
      }`,
      description: 'Mixed language event with Korean time and English venue'
    }
  ],
  
  variables: [
    {
      name: 'ocrText',
      type: 'string',
      required: true,
      description: 'OCR text with mixed Korean and English'
    },
    {
      name: 'currentDateTime',
      type: 'string',
      required: true,
      description: 'Current date and time'
    },
    {
      name: 'userLanguage',
      type: 'string',
      required: true,
      description: 'User preferred language (ko/en)'
    }
  ]
};

// Specialized templates for different document types
export const POSTER_EVENT_PROMPT: PromptTemplate = {
  id: 'poster-event-v1',
  name: 'Poster Event Parser',
  description: 'Extract events from poster/flyer text',
  language: 'ko',
  template: `이벤트 포스터나 플라이어에서 정보를 추출합니다.

포스터 특성:
- 큰 제목 텍스트가 이벤트명
- 날짜/시간 정보가 여러 줄에 분산될 수 있음
- 장소 정보가 하단에 위치
- 주최자 정보 포함
- 참가비나 티켓 정보 있을 수 있음

**입력 텍스트:**
{{ocrText}}

포스터/플라이어 형식에 맞춰 이벤트 정보를 추출해주세요.`,
  
  examples: [],
  variables: []
};

export const INVITATION_PROMPT: PromptTemplate = {
  id: 'invitation-v1',
  name: 'Invitation Parser',
  description: 'Extract events from invitation text',
  language: 'ko',
  template: `초대장이나 청첩장에서 이벤트 정보를 추출합니다.

초대장 특성:
- 정중한 표현 ("모시고자 합니다", "참석해주시기 바랍니다")
- 결혼식, 돌잔치, 기념행사 등
- 여러 날짜/시간이 있을 수 있음 (식, 피로연 등)
- 연락처 정보 포함

**입력 텍스트:**
{{ocrText}}

초대장 형식에 맞춰 이벤트 정보를 추출해주세요.`,
  
  examples: [],
  variables: []
};

// Template registry
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  'korean-calendar': KOREAN_CALENDAR_PROMPT,
  'english-calendar': ENGLISH_CALENDAR_PROMPT,
  'mixed-language': MIXED_LANGUAGE_PROMPT,
  'poster-event': POSTER_EVENT_PROMPT,
  'invitation': INVITATION_PROMPT,
};

// Template selection logic
export function selectPromptTemplate(
  context: {
    primaryLanguage: 'ko' | 'en';
    documentType?: string;
    textLanguages: string[];
  }
): PromptTemplate {
  const { primaryLanguage, documentType, textLanguages } = context;
  
  // Check for document type specific templates
  if (documentType === 'poster' || documentType === 'flyer') {
    return PROMPT_TEMPLATES['poster-event'];
  }
  
  if (documentType === 'invitation') {
    return PROMPT_TEMPLATES['invitation'];
  }
  
  // Check for mixed language content
  const hasKorean = textLanguages.includes('ko');
  const hasEnglish = textLanguages.includes('en');
  
  if (hasKorean && hasEnglish) {
    return PROMPT_TEMPLATES['mixed-language'];
  }
  
  // Use primary language template
  if (primaryLanguage === 'en') {
    return PROMPT_TEMPLATES['english-calendar'];
  }
  
  return PROMPT_TEMPLATES['korean-calendar'];
}

// Prompt variable injection
export function injectPromptVariables(
  template: PromptTemplate,
  variables: Record<string, any>
): string {
  let prompt = template.template;
  
  // Replace template variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  // Inject examples if available
  if (template.examples.length > 0 && variables.includeExamples !== false) {
    const exampleText = template.examples
      .map(example => `**예시 ${template.examples.indexOf(example) + 1}:**\n입력: ${example.input}\n출력: ${example.output}\n`)
      .join('\n');
    
    prompt = prompt.replace('{{examples}}', exampleText);
  } else {
    prompt = prompt.replace('{{examples}}', '');
  }
  
  return prompt;
}

// System message generators
export function generateSystemMessage(language: 'ko' | 'en' | 'mixed'): string {
  const messages = {
    ko: `당신은 한국어 텍스트에서 캘린더 이벤트를 추출하는 전문 AI입니다.
- OCR로 추출된 텍스트를 분석하여 날짜, 시간, 장소, 제목 등을 정확히 파악합니다.
- 상대적 날짜 표현(오늘, 내일, 다음주 등)을 절대 날짜로 변환합니다.
- 한국의 문화적 맥락과 표현을 이해합니다.
- 항상 구조화된 JSON 형식으로 응답합니다.`,
    
    en: `You are a professional AI specialized in extracting calendar events from English text.
- Analyze OCR-extracted text to accurately identify dates, times, locations, titles, etc.
- Convert relative date expressions (today, tomorrow, next week, etc.) to absolute dates.
- Understand cultural context and expressions.
- Always respond in structured JSON format.`,
    
    mixed: `You are a professional AI that extracts calendar events from Korean and English mixed text.
- Handle both Korean and English date/time expressions accurately.
- Maintain cultural context for both languages.
- Provide appropriate translations when helpful.
- Always respond in structured JSON format.`
  };
  
  return messages[language];
}