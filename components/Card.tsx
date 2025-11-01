import { CardProps } from '@/types'; // CardProps 타입 정의 파일 경로 확인

export default function Card({ card, onDelete, onNameChange }: CardProps) {
  return (
    <div className="
      relative border rounded-2xl shadow-xl overflow-hidden bg-white
      flex flex-col
      transition-all duration-300 ease-in-out
      hover:shadow-2xl hover:scale-105
    ">
      <div className="p-5 flex-grow space-y-4"> {/* flex-grow 추가하여 이미지가 아래로 밀려나도록 */}
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

        <div className="flex justify-between items-center mt-4"> {/* 간격 조정 */}
          {/* 2. 빌드 페이지 링크 */}
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

      {/* 4. 스크린샷 이미지 (아래쪽으로 이동) */}
      {card.screenshot && ( // 스크린샷 URL이 있을 때만 렌더링
        <div className="bg-gray-50 p-2 border-t rounded-b-2xl"> {/* 이미지 배경 및 상단 보더 추가 */}
          <img
            src={card.screenshot}
            alt={`${card.name} 스크린샷`}
            className="w-full h-auto object-cover rounded-xl border border-gray-200"
            loading="lazy" // 이미지 로딩 최적화
          />
        </div>
      )}
    </div>
  );
}