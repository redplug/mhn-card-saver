'use client'; 

import { useState, useEffect, FormEvent, useCallback, useRef } from 'react'; // useRef 추가
import Card from '@/components/Card';

export type CardType = {
  id: number;
  url: string;
  screenshot: string;
  name: string;
};

// --- [추가] 검색 아이콘 ---
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

// --- [분리] ClientForm에 필요한 Props 정의 ---
interface ClientFormProps {
  urlInput: string;
  searchKeyword: string; // 필터링에 사용될 최종 검색 키워드
  isLoading: boolean;
  handleAddCard: (e: React.FormEvent<HTMLFormElement>) => void;
  handleSearch: () => void; // 검색 버튼 클릭 핸들러
  setUrlInput: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement>; // Ref 객체
}

// --- [분리] ClientForm 컴포넌트 정의 ---
const ClientForm = ({
  urlInput,
  isLoading,
  handleAddCard,
  handleSearch,
  setUrlInput,
  searchRef,
}: ClientFormProps) => {

  // 검색 입력 필드에서 Enter 키를 눌렀을 때 검색 실행
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // 기본 폼 제출 방지
      handleSearch();
    }
  };

  return (
    <>
      {/* URL 입력 폼 */}
      <form onSubmit={handleAddCard} className="flex gap-2 mb-8">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://mhn.quest 빌드 링크를 붙여넣으세요"
          className="flex-grow border p-3 rounded-lg"
          required
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? '생성 중...' : '추가'}
        </button>
      </form>
      
      {/* ⬇️ [수정] 검색 입력창 및 버튼 ⬇️ */}
      <div className="mb-8 flex gap-2">
        <input
          type="text"
          ref={searchRef} // 1. Ref 연결 (비제어 컴포넌트)
          onKeyDown={handleKeyDown} // 2. Enter 키 감지
          placeholder="빌드명으로 검색하세요..."
          className="w-full border p-3 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800"
          aria-label="검색 실행"
        >
          <SearchIcon />
        </button>
      </div>
      {/* ⬆️ 검색 입력창 및 버튼 끝 ⬆️ */}
    </>
  );
};


// --- Home 컴포넌트 (메인) ---
export default function Home() {
  // --- 상태 관리 (STATE) ---
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<CardType[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // 1. [수정] 검색에 사용될 최종 키워드 상태
  const [searchKeyword, setSearchKeyword] = useState(""); 
  const [isClient, setIsClient] = useState(false); 
  
  // 2. [추가] 검색 입력 필드의 값을 읽기 위한 Ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- 파생 상태 (DERIVED STATE) ---
  const filteredCards = cards.filter(card => 
    // 필터링은 searchKeyword 상태를 사용합니다.
    searchKeyword === "" || card.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // --- 검색 핸들러 (버튼 클릭 시 실행) ---
  const handleSearch = useCallback(() => {
    // 1. Ref에서 현재 입력된 값을 가져와서
    const currentInput = searchInputRef.current?.value || "";
    // 2. 검색 키워드 상태를 업데이트합니다. (이때만 리렌더링 발생)
    setSearchKeyword(currentInput.trim());
  }, []); // 의존성 없음 (Ref를 사용하므로)

  // --- DB 로드, DB 저장 (EFFECT) ---
  useEffect(() => {
    setIsClient(true);
    async function loadCards() {
      // ... (DB 로직은 동일)
      try {
        const res = await fetch('/api/cards');
        if (!res.ok) { throw new Error(`API가 에러를 반환했습니다: ${res.status}`); }
        const data = await res.json();
        setCards(data);
      } catch (error) {
        console.error("--- [Client] loadCards 실패:", error);
        alert(`[로드 실패] 카드 목록을 불러오는 데 실패했습니다: ${error.message}`);
      }
      setIsInitialLoad(false);
    }
    loadCards();
  }, []);

  useEffect(() => {
    if (isInitialLoad) { return; }
    async function saveCardsToDB() {
      // ... (DB 저장 로직은 동일)
      try {
        const res = await fetch('/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cards) });
        if (!res.ok) { throw new Error(`API가 에러를 반환했습니다: ${res.status}`); }
      } catch (error) {
        console.error("--- [Client] saveCardsToDB 실패:", error);
        alert(`[저장 실패] 카드 목록을 저장하는 데 실패했습니다: ${error.message}`);
      }
    }
    saveCardsToDB();
  }, [cards, isInitialLoad]);

  // --- 카드 추가 핸들러 ---
  const handleAddCard = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!urlInput) return;

    const isDuplicate = cards.some(card => card.url === urlInput);
    if (isDuplicate) {
      alert("이미 추가된 빌드 주소입니다! 중복된 주소는 추가할 수 없습니다.");
      setUrlInput("");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/screenshot?url=${encodeURIComponent(urlInput)}`);
      if (!res.ok) {
        const errorData = await res.json();
        
        if (errorData.debugScreenshotBase64) {
          const errorCard: CardType = { id: Date.now(), url: urlInput, screenshot: `data:image/png;base64,${errorData.debugScreenshotBase64}`, name: "⚠️ 스크린샷 실패 (디버그 화면)" };
          setCards(prevCards => [errorCard, ...prevCards]);
          setIsLoading(false);
          alert(`오류: 스크린샷 영역을 찾지 못했습니다. 디버그 카드를 확인해주세요.`);
          return;
        }

        const message = errorData.error || errorData.details || '스크린샷 생성에 실패했습니다.';
        throw new Error(message);
      }

      const data = await res.json();
      if (data.screenshotBase64) {
        const newCard: CardType = { id: Date.now(), url: urlInput, screenshot: `data:image/png;base64,${data.screenshotBase64}`, name: "새 빌드" };
        setCards(prevCards => [newCard, ...prevCards]);
        setUrlInput("");
      }

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert("오류가 발생했습니다: " + errorMessage);
    }

    setIsLoading(false);
  }, [urlInput, cards]);

  // --- 카드 수정/삭제 핸들러 ---
  const handleDeleteCard = useCallback((id: number) => {
    const isConfirmed = window.confirm(`정말로 이 빌드를 삭제하시겠습니까?`);
    if (isConfirmed) {
      setCards(prevCards => prevCards.filter(card => card.id !== id));
    }
  }, []);

  const handleNameChange = useCallback((id: number, newName: string) => {
    setCards(prevCards => prevCards.map(card => 
      card.id === id ? { ...card, name: newName } : card
    ));
  }, []);
  
  // --- 최종 렌더링 (RETURN) ---
  return (
    <main 
      className="container mx-auto p-4 max-w-3xl"
      suppressHydrationWarning={true}
    >
      <h1 className="text-3xl font-bold mb-6 text-center">MHN 빌드 세이버</h1>

      {/* 1. isClient 상태에 따라 폼을 조건부 렌더링 */}
      {isClient ? 
        <ClientForm 
          urlInput={urlInput}
          searchKeyword={searchKeyword}
          isLoading={isLoading}
          handleAddCard={handleAddCard}
          handleSearch={handleSearch}
          setUrlInput={setUrlInput}
          searchRef={searchInputRef} // Ref 전달
        /> 
        : (
        <div className="h-24 mb-8 flex justify-center items-center text-gray-500">
          UI 로딩 중...
        </div>
      )}
      
      {/* 2. 카드 목록이 표시될 공간 */}
      <div className="space-y-6">
        {/* 로딩 상태 표시 */}
        {isLoading && (
          <p className="text-center text-blue-500">
            스크린샷을 생성 중입니다...
          </p>
        )}

        {/* 🚨 필터링된 카드 목록 렌더링 */}
        {filteredCards.length > 0 ? (
          filteredCards.map(card => (
            <Card
              key={card.id}
              card={card}
              onDelete={handleDeleteCard}
              onNameChange={handleNameChange}
            />
          ))
        ) : (
          // 🚨 검색 결과가 없을 때 높이를 고정하여 DOM 변동을 최소화합니다.
          <div className="min-h-[100px] flex items-center justify-center">
            {cards.length === 0 && !isLoading ? (
              <p className="text-center text-gray-500">아직 추가된 빌드가 없습니다.</p>
            ) : (
              !isLoading && (
                <p className="text-center text-gray-500">'{searchKeyword}'에 해당하는 빌드를 찾을 수 없습니다.</p>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
