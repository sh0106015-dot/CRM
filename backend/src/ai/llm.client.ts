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

  /** system + user 프롬프트로 텍스트 응답을 받는다. */
  async complete(params: {
    system: string;
    user: string;
    maxTokens?: number;
  }): Promise<string> {
    if (!this.client) {
      throw new Error('LLM_DISABLED');
    }
    // claude-opus-5 는 adaptive thinking 이 기본값이므로 thinking 파라미터를 생략한다.
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 1200,
      system: params.system,
      messages: [{ role: 'user', content: params.user }],
    });

    return response.content
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
  }): Promise<T | null> {
    const raw = await this.complete({
      ...params,
      system: `${params.system}\n\n반드시 유효한 JSON 하나만 출력하세요. 코드블록, 설명 문장을 붙이지 마세요.`,
    });
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
