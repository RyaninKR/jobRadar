import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Claude tool_use 기능에서 사용하는 도구 정의
 * 채용 모니터링 에이전트가 사용할 수 있는 도구 목록
 */
export const agentTools: Tool[] = [
  {
    name: 'search_jobs',
    description:
      '채용 공고를 검색합니다. 키워드, 기술 스택, 지역, 경력, 연봉 등 다양한 조건으로 필터링할 수 있습니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: '검색 키워드 (직무명, 회사명, 기술 스택 등)',
        },
        filters: {
          type: 'object',
          description: '검색 필터 조건',
          properties: {
            sources: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['wanted', 'jobkorea', 'saramin', 'jobplanet'],
              },
              description: '채용 플랫폼 소스',
            },
            job_types: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['full-time', 'contract', 'intern', 'freelance'],
              },
              description: '고용 형태',
            },
            locations: {
              type: 'array',
              items: { type: 'string' },
              description: '지역 (예: 서울, 판교, 부산)',
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description: '기술 스택 (예: React, Python, TypeScript)',
            },
            experience_min: {
              type: 'number',
              description: '최소 경력 (년)',
            },
            experience_max: {
              type: 'number',
              description: '최대 경력 (년)',
            },
            salary_min: {
              type: 'number',
              description: '최소 연봉 (만원)',
            },
            salary_max: {
              type: 'number',
              description: '최대 연봉 (만원)',
            },
          },
        },
        limit: {
          type: 'number',
          description: '결과 개수 제한 (기본값: 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_job_detail',
    description:
      '특정 채용 공고의 상세 정보를 조회합니다. 공고 설명, 자격 요건, 우대사항, 지원 링크 등을 포함합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id: {
          type: 'string',
          description: '조회할 채용 공고 ID',
        },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'analyze_trend',
    description:
      '채용 시장 트렌드를 분석합니다. 특정 기술 스택이나 직무 카테고리의 공고 수 변화, 연봉 동향, 인기 기업 등을 확인합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        skill: {
          type: 'string',
          description: '분석할 기술 스택 또는 직무 카테고리',
        },
        period: {
          type: 'string',
          enum: ['7d', '30d', '90d'],
          description: '분석 기간',
        },
        filters: {
          type: 'object',
          description: '추가 필터 조건',
          properties: {
            locations: {
              type: 'array',
              items: { type: 'string' },
              description: '지역 필터',
            },
            job_types: {
              type: 'array',
              items: { type: 'string' },
              description: '고용 형태 필터',
            },
          },
        },
      },
      required: ['skill', 'period'],
    },
  },
  {
    name: 'compare_companies',
    description:
      '여러 기업의 채용 현황을 비교합니다. 공고 수, 연봉 수준, 주요 채용 직군, 요구 기술 스택 등을 비교 분석합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_names: {
          type: 'array',
          items: { type: 'string' },
          description: '비교할 기업명 목록 (2개 이상)',
        },
      },
      required: ['company_names'],
    },
  },
  {
    name: 'set_alert',
    description:
      '채용 알림을 설정합니다. 특정 조건에 맞는 새로운 채용 공고가 올라오면 알림을 받을 수 있습니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: '알림 이름 (예: "프론트엔드 개발자 공고 알림")',
        },
        conditions: {
          type: 'object',
          description: '알림 조건',
          properties: {
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: '키워드',
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description: '기술 스택',
            },
            locations: {
              type: 'array',
              items: { type: 'string' },
              description: '지역',
            },
            companies: {
              type: 'array',
              items: { type: 'string' },
              description: '회사명',
            },
            salary_min: {
              type: 'number',
              description: '최소 연봉 (만원)',
            },
            experience_max: {
              type: 'number',
              description: '최대 경력 (년)',
            },
            job_types: {
              type: 'array',
              items: { type: 'string' },
              description: '고용 형태',
            },
          },
        },
        frequency: {
          type: 'string',
          enum: ['realtime', 'daily', 'weekly'],
          description: '알림 빈도',
        },
      },
      required: ['name', 'conditions', 'frequency'],
    },
  },
];
