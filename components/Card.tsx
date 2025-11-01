// components/Card.tsx

// 카드 컴포넌트에 필요한 데이터와 함수들을 정의합니다.
type CardProps = {
  card: {
    id: number;
    url: string;
    screenshot: string;
    name: string;
  };
  onDelete: (id: number) => void; // 삭제 함수
  onNameChange: (id: number, newName: string) => void; // 이름 변경 함수
};

export default function Card({ card, onDelete, onNameChange }: CardProps) {
  return (
    <div className="border rounded-xl shadow-lg overflow-hidden bg-white">
      <div className="p-4 space-y-4">
        {/* 2. 빌드명 입력 텍스트 박스 */}
        <input
          type="text"
          value={card.name}
          onChange={(e) => onNameChange(card.id, e.target.value)}
          className="w-full text-lg font-semibold border-b p-2 rounded text-black"
        />

        <div className="flex justify-between items-center">
          {/* 3. 빌드 페이지 링크 */}
          <a 
            href={card.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            빌드 페이지로 이동
          </a>

          {/* 4. 삭제 버튼 */}
          <button
            onClick={() => onDelete(card.id)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            삭제
          </button>
          {/* 1. 스크린샷 이미지 */}
          <img 
            src={card.screenshot} 
            alt={`${card.name} screenshot`} 
            className="w-full border-b" 
          />
        </div>
      </div>
    </div>
  );
}