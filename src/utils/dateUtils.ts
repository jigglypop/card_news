// 새로운 파일 생성
export function getYesterdayDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDateString(date);
}

export function isFutureDate(filename: string): boolean {
  const currentYear = new Date().getFullYear();
  return filename.includes(`${currentYear + 1}-`) || 
         filename.includes(`${currentYear + 2}-`) || 
         filename.includes(`${currentYear + 3}-`) || 
         filename.includes(`${currentYear + 4}-`) || 
         filename.includes(`${currentYear + 5}-`);
}

export function getCurrentDateString(): string {
  const date = new Date();
  return formatDateString(date);
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateValid(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const currentYear = new Date().getFullYear();
  const year = parseInt(dateStr.split('-')[0], 10);
  
  // 미래 년도 확인
  if (year > currentYear) return false;
  
  // 날짜가 유효한지 확인
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

export function generateUniqueId(): string {
  return Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(-5);
} 