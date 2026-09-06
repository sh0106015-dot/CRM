import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Anthropic Claude 호출 래퍼.
 *
 * - ANTHROPIC_API_KEY 가 없으면 `enabled === false` 로 동작하며
 *   상위 서비스는 규칙 기반 폴백을 사용한다.
 * - PRD 31장: 고객의 민감정보가 불필요하게 모델로 전달되지 않도록
 *   호출부에서 최소 데이터만 담아 전달한다.
 */
@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.model = config.get<string>('AI_MODEL', 'claude-opus-5');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn(
        'ANTHROPIC_API_KEY 미설정 - AI 기능은 규칙 기반 폴백으로 동작합니다.',
      );
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /** system + user 프롬프트로 텍스트 응답을 받는다. webSearch=true 면 웹 검색 도구를 붙인다. */
  async complete(params: {
    system: string;
    user: string;
    maxTokens?: number;
    webSearch?: boolean;
    maxSearches?: number;
  }): Promise<string> {
    if (!this.client) {
      throw new Error('LLM_DISABLED');
    }
    const tools: Anthropic.Messages.ToolUnion[] = params.webSearch
      ? [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: params.maxSearches ?? 5,
          },
        ]
      : [];

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: params.user }];
    let response: Anthropic.Message | undefined;

    // 서버 도구가 pause_turn 을 반환하면 이어서 요청한다 (최대 4회).
    for (let i = 0; i < 4; i += 1) {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: params.maxTokens ?? 1200,
        system: params.system,
        messages,
        ...(tools.length ? { tools } : {}),
      });
      if (response.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: response.content });
    }

    return (response?.content ?? [])
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
  }

  /** 모델에 JSON 응답을 요구하고 파싱한다. 실패 시 null. */
  async completeJson<T>(params: {
    system: string;
    user: string;
    maxTokens?: number;
    webSearch?: boolean;
    maxSearches?: number;
  }): Promise<T | null> {
    const raw = await this.complete({
      ...params,
      system: `${params.system}\n\n반드시 유효한 JSON 하나만 출력하세요. 코드블록, 설명 문장을 붙이지 마세요.`,
    });
    return parseJson<T>(raw);
  }

  /** 이미지(base64) + 프롬프트로 JSON 을 추출한다. (명함 인식 등) */
  async extractFromImageJson<T>(params: {
    base64: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
    system: string;
    user: string;
    maxTokens?: number;
  }): Promise<T | null> {
    if (!this.client) {
      throw new Error('LLM_DISABLED');
    }
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 700,
      system: `${params.system}\n\n반드시 유효한 JSON 하나만 출력하세요. 코드블록, 설명 문장을 붙이지 마세요.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: params.mediaType,
                data: params.base64,
              },
            },
            { type: 'text', text: params.user },
          ],
        },
      ],
    });
    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return parseJson<T>(raw);
  }

  /** 문서(PDF base64) 또는 이미지 + 프롬프트로 JSON 추출. (보험증권/약관 요약 등) */
  async analyzeDocumentJson<T>(params: {
    base64: string;
    mediaType:
      | 'application/pdf'
      | 'image/png'
      | 'image/jpeg'
      | 'image/webp'
      | 'image/gif';
    system: string;
    user: string;
    maxTokens?: number;
  }): Promise<T | null> {
    if (!this.client) {
      throw new Error('LLM_DISABLED');
    }
    const doc: Anthropic.ContentBlockParam =
      params.mediaType === 'application/pdf'
        ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: params.base64,
            },
          }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: params.mediaType,
              data: params.base64,
            },
          };

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 1500,
      system: `${params.system}\n\n반드시 유효한 JSON 하나만 출력하세요. 코드블록, 설명 문장을 붙이지 마세요.`,
      messages: [{ role: 'user', content: [doc, { type: 'text', text: params.user }] }],
    });
    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return parseJson<T>(raw);
  }
}

function parseJson<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
