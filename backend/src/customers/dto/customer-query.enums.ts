/** PRD 7장: 고객 목록 필터 */
export enum CustomerFilter {
  NEEDS_CARE = 'NEEDS_CARE', // 관리 필요
  RECENT_CONSULT = 'RECENT_CONSULT', // 최근 상담
  LONG_UNMANAGED = 'LONG_UNMANAGED', // 장기 미관리
  NEW = 'NEW', // 신규 고객
  VIP = 'VIP',
  BIRTHDAY = 'BIRTHDAY', // 생일 (이번 달)
  CONTRACT = 'CONTRACT', // 계약 관련
  CONSULT_SCHEDULED = 'CONSULT_SCHEDULED', // 상담 예정
}

/** PRD 7장: 정렬 */
export enum CustomerSort {
  AI_SCORE = 'AI_SCORE', // AI 관리점수
  LAST_CONTACT = 'LAST_CONTACT', // 최근 상담일
  CREATED_AT = 'CREATED_AT', // 등록일
  NAME = 'NAME', // 이름
}
