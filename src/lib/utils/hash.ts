import CryptoJS from 'crypto-js'

/**
 * 공고 중복 제거용 해시 생성
 * company_name + title + location을 정규화하여 SHA256 해시 생성
 */
export function generateDeduplicationHash(
  companyName: string,
  title: string,
  location: string | null
): string {
  const normalized = [
    companyName.trim().toLowerCase().replace(/\s+/g, ''),
    title.trim().toLowerCase().replace(/\s+/g, ''),
    (location || '').trim().toLowerCase().replace(/\s+/g, ''),
  ].join('|')

  return CryptoJS.SHA256(normalized).toString()
}

/**
 * 회사명 정규화 (검색/매칭용)
 * "(주)", "주식회사" 등 제거, 소문자 변환, 공백 제거
 */
export function normalizeCompanyName(name: string): string {
  return name
    .replace(/\(주\)|주식회사|㈜|\(유\)|유한회사/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
}
