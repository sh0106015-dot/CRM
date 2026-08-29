/**
 * e2e 실행 전 환경변수 로드.
 * `.env.test` 가 있으면 우선, 없으면 `.env` 를 사용한다.
 * (ConfigModule 도 .env 를 읽지만, Prisma 클라이언트가 먼저 process.env 를
 *  참조하는 경우를 대비해 여기서 명시적으로 로드한다.)
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const root = resolve(__dirname, '..');
const testEnv = resolve(root, '.env.test');
config({ path: existsSync(testEnv) ? testEnv : resolve(root, '.env') });
