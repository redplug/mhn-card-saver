import { useState, useCallback } from 'react'; // 🚨 [추가] useState와 useCallback을 import 합니다.
import { CardProps } from '@/types'; // CardProps 타입 정의 파일 경로 확인

// 복사 아이콘 SVG
const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.043 9.043 0 0 1 2.883-2.022.75.75 0 0 1 .46-.076L13.84 5.25a.75.75 0 0 1 .63.743L14.4 7.5c0 .886.714 1.6 1.6 1.6h2.55c.57 0 1.05.38 1.173.93L20 15.65c.105.474-.236.936-.708 1.056L18 17.25h-2.25z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L7.5 13.5m4.5-3.75l4.5 3.75m-4.5-3.75v7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.84 5.25a.75.75 0 0 1 .63.743L14.4 7.5c0 .886.714 1.6 1.6 1.6h2.55c.57 0 1.05.38 1.173.93L20 15.65c.105.474-.236.936-.708 1.056L18 17.25h-2.25z" />
  </svg>
);

// 완료 체크 아이콘 SVG
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export default function Card({ card, onDelete, onNameChange }: CardProps) {
  // 복사 상태를 관리하는 State (기본값: false)
  const [isCopied, setIsCopied] = useState(false);

  // URL 복사 핸들러
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(card.url);
      setIsCopied(true);
      // 2초 후 상태를 복구
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('URL 복사 실패:', err);
      // 에러 처리 로직 (선택적)
    }
  }, [card.url]);

  return (
    <div className="
      relative border rounded-2xl shadow-xl overflow-hidden bg-white
      flex flex-col
      transition-all duration-300 ease-in-out
      hover:shadow-2xl hover:scale-105
    ">
      <div className="p-5 flex-grow space-y-4"> 
        {/* 1. 빌드명 입력 텍스트 박스 */}
        <input
          type="text"
          value={card.name}
          onChange={(e) => onNameChange(card.id, e.target.value)}
          className="
            w-full text-lg font-semibold border-b-2 border-gray-200 p-2 rounded-md
            text-gray-800 focus:outline-none focus:border-blue-500
            transition-colors duration-200
          "
          aria-label="빌드 이름"
        />

        <div className="flex justify-between items-center mt-4"> 
          {/* 2. 링크 관련 버튼 그룹 */}
          <div className="flex space-x-2"> 
            
            {/* 2-1. 빌드 페이지 이동 링크 */}
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-blue-600 hover:text-blue-800 hover:underline font-medium
                flex items-center space-x-1
              "
              aria-label={`${card.name} 빌드 페이지로 이동`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              <span>이동</span>
            </a>
            
            {/* 2-2. [추가] 복사 버튼 */}
            <button
              onClick={handleCopy}
              className={`
                px-3 py-1 rounded-lg text-sm font-medium
                flex items-center space-x-1
                ${isCopied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                transition-colors duration-200
              `}
              aria-label="빌드 링크 복사"
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
              <span>{isCopied ? '복사 완료!' : '복사'}</span>
            </button>
            
          </div>

          {/* 3. 삭제 버튼 */}
          <button
            onClick={() => onDelete(card.id)}
            className="
              bg-red-500 text-white px-4 py-2 rounded-lg font-medium
              hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
              transition-colors duration-200
            "
            aria-label={`${card.name} 빌드 삭제`}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 4. 스크린샷 이미지 */}
      {card.screenshot && ( 
        <div className="bg-gray-50 p-2 border-t rounded-b-2xl"> 
          <img
            src={card.screenshot}
            alt={`${card.name} 스크린샷`}
            className="w-full h-auto object-cover rounded-xl border border-gray-200"
            loading="lazy" 
          />
        </div>
      )}
    </div>
  );
}