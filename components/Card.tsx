// CardType 및 CardProps는 이제 이 파일 내에서 정의하고 export 합니다.

export type CardType = {
  id: number;
  url: string;
  screenshot: string;
  name: string;
  description: string; // 새로운 필드: 여러 줄 설명
  createdAt?: number; // 등록날짜 (타임스탬프, 선택적 필드)
};

interface CardProps {
  card: CardType;
  onDelete: (id: number) => void;
  onNameChange: (id: number, newName: string) => void;
  // 새로운 핸들러: 설명 변경 시 호출
  onDescriptionChange: (id: number, newDescription: string) => void; 
}

// 아이콘 정의는 생략 (기존 코드와 동일)
const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
    </svg>
);

export default function Card({ card, onDelete, onNameChange, onDescriptionChange }: CardProps) {
  // FIX: card prop이 정의되지 않았을 경우 렌더링을 중단하여 TypeError를 방지합니다.
  if (!card) {
    console.error("Card component received undefined card prop.");
    return null;
  }
  
  // 삭제 확인 팝업 로직 (alert 대신 커스텀 UI를 사용하는 것이 권장되지만, 기존 로직 유지)
  const handleDeleteClick = () => {
    // 경고: Canvas 환경에서는 window.confirm/alert 사용이 권장되지 않습니다.
    const isConfirmed = window.confirm(
      `"${card.name}" 빌드를 정말로 삭제하시겠습니까?`
    );

    if (isConfirmed) {
      onDelete(card.id);
    }
  };

  return (
    <div className="
      relative border rounded-lg shadow-md overflow-hidden bg-white
      flex flex-col
      transition-all duration-300 ease-in-out
      hover:shadow-lg
    ">
      
      {/* 1. [수정] 패딩 p-5 -> p-3으로 축소, space-y-4 -> space-y-2로 축소 */}
      <div className="p-3 flex-grow space-y-2"> 
        
        {/* 1-1. 빌드명 입력 텍스트 박스 및 등록날짜 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={card.name}
            onChange={(e) => onNameChange(card.id, e.target.value)}
            placeholder="빌드 이름"
            className="
              flex-1 text-base font-semibold border-b border-gray-300 p-1 rounded-sm
              text-gray-800 focus:outline-none focus:border-blue-500
            "
            aria-label="빌드 이름"
          />
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {new Date(card.createdAt || card.id).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}
          </span>
        </div>

        {/* 1-2. [새로 추가] 여러 줄 설명 기록 영역 (Textarea) */}
        <textarea
          value={card.description}
          onChange={(e) => onDescriptionChange(card.id, e.target.value)}
          placeholder="여기에 빌드에 대한 여러 줄 설명을 기록하세요."
          rows={3} // 표시될 기본 행 수 설정
          className="
            w-full text-sm border border-gray-300 p-2 rounded-md resize-none
            text-gray-600 focus:outline-none focus:border-indigo-500
            transition-shadow
          "
          aria-label="빌드 설명"
        />

        {/* 2. 링크 및 버튼 그룹 */}
        {/* [수정] mt-4 -> mt-2로 축소 */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100"> 
          
          {/* 2-1. 빌드 페이지 이동 링크 */}
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium
              flex items-center space-x-1
            "
            aria-label={`${card.name} 빌드 페이지로 이동`}
          >
            <ArrowRightIcon className="h-4 w-4"/> {/* 아이콘 크기 h-5 -> h-4로 축소 */}
            <span>이동</span>
          </a>
          
          {/* 2-2. 삭제 버튼 */}
          <button
            onClick={handleDeleteClick}
            className="
              bg-red-500 text-white px-3 py-1 rounded-md text-sm font-medium /* 패딩 및 텍스트 크기 축소 */
              hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500
              transition-colors duration-200
            "
            aria-label={`${card.name} 빌드 삭제`}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 3. 스크린샷 이미지 */}
      {card.screenshot && ( 
        <div className="bg-gray-50 p-1 border-t rounded-b-lg"> {/* [수정] 패딩 p-2 -> p-1로 축소 */}
          <img
            src={card.screenshot}
            alt={`${card.name} 스크린샷`}
            className="w-full h-auto object-cover rounded-md border border-gray-200"
            loading="lazy" 
          />
        </div>
      )}
    </div>
  );
}
