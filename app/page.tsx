'use client'; 

import { useState, useEffect, FormEvent, useCallback } from 'react';
// FIX: 경로 별칭 (@/) 대신 상대 경로 (../components/Card)를 사용하여 빌드 오류를 해결
import Card, { CardType } from '../components/Card'; 

// --- [분리] ClientForm에 필요한 Props 정의 ---
interface ClientFormProps {
  urlInput: string;
  searchTerm: string;
  isLoading: boolean;
  // 핸들러 함수들은 useCallback으로 감싸져 props로 전달됩니다.
  handleAddCard: (e: React.FormEvent<HTMLFormElement>) => void;
  setUrlInput: (value: string) => void;
  setSearchTerm: (value: string) => void;
}

// --- [분리] ClientForm 컴포넌트 정의 (Home 함수 밖으로 이동) ---
const ClientForm = ({
  urlInput,
  searchTerm,
  isLoading,
  handleAddCard,
  setUrlInput,
  setSearchTerm,
}: ClientFormProps) => (
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
    
    {/* 검색 입력창 */}
    <div className="mb-8">
      <input
        type="text"
        value={searchTerm}
        // [핵심] 상태 setter 함수를 직접 사용하여 단순화 (불필요한 로직 제거)
        onChange={(e) => setSearchTerm(e.target.value)} 
        placeholder="빌드명으로 검색하세요..."
        className="w-full border p-3 rounded-lg focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  </>
);


// --- Home 컴포넌트 (메인) ---
export default function Home() {
  // --- 상태 관리 (STATE) ---
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // CardType을 Card.tsx에서 가져온 정의로 사용합니다.
  const [cards, setCards] = useState<CardType[]>([]); 
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [isClient, setIsClient] = useState(false); // 클라이언트 렌더링 확인

  // --- 파생 상태 (DERIVED STATE) ---
  const filteredCards = cards.filter(card => 
    card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    // [추가] description 필드에서도 검색하도록 확장
    card.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- DB 로드 (EFFECT) ---
  useEffect(() => {
    setIsClient(true);
    async function loadCards() {
      console.log("--- [Client] loadCards: 카드 불러오기 시작...");
      try {
        const res = await fetch('/api/cards');
        if (!res.ok) {
          throw new Error(`API가 에러를 반환했습니다: ${res.status}`);
        }
        const data: CardType[] = await res.json();
        
        // [수정] DB에서 불러온 데이터에 description 필드가 없을 경우 기본값 ""을 할당
        const safeData = data.map(card => ({
            ...card,
            // description 필드가 없거나(DB 마이그레이션 중) null이면 ""을 할당
            description: card.description || "", 
        }));
        
        setCards(safeData);
        console.log(`--- [Client] loadCards: 카드 ${safeData.length}개 불러오기 성공.`);
      } catch (error) {
        console.error("--- [Client] loadCards 실패:", error);
      
        let errorMessage = "알 수 없는 오류가 발생했습니다."; // Default message

        if (error instanceof Error) {
          // Now TypeScript knows 'error' has a 'message' property
          errorMessage = error.message; 
        }
        
        // 경고: Canvas 환경에서는 alert 대신 커스텀 UI를 사용하세요.
        alert(`[로드 실패] 카드 목록을 불러오는 데 실패했습니다: ${errorMessage}`);
      }
      setIsInitialLoad(false);
    }
    
    loadCards();
  }, []);

  // --- DB 저장 (EFFECT) ---
  useEffect(() => {
    if (isInitialLoad) {
      return; 
    }
    
    async function saveCardsToDB() {
      console.log(`--- [Client] saveCardsToDB: 카드 ${cards.length}개 저장 시도...`);
      try {
        const res = await fetch('/api/cards', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cards), 
        });
        if (!res.ok) {
          throw new Error(`API가 에러를 반환했습니다: ${res.status}`);
        }
        console.log("--- [Client] saveCardsToDB: 저장 성공.");
      } catch (error) {
        console.error("--- [Client] saveCardsToDB 실패:", error);
      
        let errorMessage = "알 수 없는 오류가 발생했습니다."; // Default fallback message

        // **Type Narrowing Check**
        // Check if the error is an instance of the built-in Error class.
        if (error instanceof Error) {
          errorMessage = error.message; 
        }
        
        // 경고: Canvas 환경에서는 alert 대신 커스텀 UI를 사용하세요.
        alert(`[저장 실패] 카드 목록을 저장하는 데 실패했습니다: ${errorMessage}`);
      }
    }
    
    saveCardsToDB();
    
  }, [cards, isInitialLoad]);

  // --- 카드 추가 핸들러 (useCallback으로 감싸기) ---
  const handleAddCard = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!urlInput) return;

    // 1. 중복 체크 로직
    const isDuplicate = cards.some(card => card.url === urlInput);
    if (isDuplicate) {
      // 경고: Canvas 환경에서는 alert 대신 커스텀 UI를 사용하세요.
      alert("이미 추가된 빌드 주소입니다! 중복된 주소는 추가할 수 없습니다.");
      setUrlInput("");
      return;
    }

    setIsLoading(true);

    try {
      // 2. 스크린샷 API 호출
      const res = await fetch(`/api/screenshot?url=${encodeURIComponent(urlInput)}`);

      if (!res.ok) {
        const errorData = await res.json();
        
        // 디버그 스크린샷 카드 생성 (스크린샷 실패 시)
        if (errorData.debugScreenshotBase64) {
          const errorCard: CardType = {
            id: Date.now(),
            url: urlInput,
            screenshot: `data:image/png;base64,${errorData.debugScreenshotBase64}`,
            name: "⚠️ 스크린샷 실패 (디버그 화면)",
            description: "스크린샷 오류가 발생했습니다. 디버그 화면을 확인하세요." // description 추가
          };
          // [핵심] 함수형 업데이트 사용
          setCards(prevCards => [errorCard, ...prevCards]); 
          setIsLoading(false);
          // 경고: Canvas 환경에서는 alert 대신 커스텀 UI를 사용하세요.
          alert(`오류: 스크린샷 영역을 찾지 못했습니다. 무엇이 보이는지 디버그 카드를 확인해주세요.`);
          return;
        }

        const message = errorData.error || errorData.details || '스크린샷 생성에 실패했습니다.';
        throw new Error(message);
      }

      const data = await res.json();

      if (data.screenshotBase64) {
        const newCard: CardType = {
          id: Date.now(),
          url: urlInput,
          screenshot: `data:image/png;base64,${data.screenshotBase64}`, 
          name: "새 빌드",
          description: "", // [추가] 새로운 카드를 만들 때 description 초기화
        };
        // [핵심] 함수형 업데이트 사용
        setCards(prevCards => [newCard, ...prevCards]); 
        setUrlInput("");
      }

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      // 경고: Canvas 환경에서는 alert 대신 커스텀 UI를 사용하세요.
      alert("오류가 발생했습니다: " + errorMessage);
    }

    setIsLoading(false);
  }, [urlInput, cards]); // 의존성: urlInput, cards

  // --- 카드 수정/삭제 핸들러 ---
  const handleDeleteCard = useCallback((id: number) => {
    // 경고: Canvas 환경에서는 window.confirm/alert 사용이 권장되지 않습니다.
    const isConfirmed = window.confirm(`정말로 이 빌드를 삭제하시겠습니까?`);
    if (isConfirmed) {
      // [핵심] 함수형 업데이트 사용
      setCards(prevCards => prevCards.filter(card => card.id !== id));
    }
  }, []); // 의존성 없음

  const handleNameChange = useCallback((id: number, newName: string) => {
    // [핵심] 함수형 업데이트 사용
    setCards(prevCards => prevCards.map(card => 
      card.id === id ? { ...card, name: newName } : card
    ));
  }, []); // 의존성 없음

  // [새로 추가] 설명 변경 핸들러
  const handleDescriptionChange = useCallback((id: number, newDescription: string) => {
    setCards(prevCards => prevCards.map(card => 
      card.id === id ? { ...card, description: newDescription } : card
    ));
  }, []);

  // --- 최종 렌더링 (RETURN) ---
  return (
    <main 
      className="container mx-auto p-4 max-w-3xl"
      suppressHydrationWarning={true}
    >
      <h1 className="text-3xl font-bold mb-6 text-center">Monster Hunter Now Build Save</h1>

      {/* 1. isClient 상태에 따라 폼을 조건부 렌더링 */}
      {isClient ? 
        <ClientForm 
          urlInput={urlInput}
          searchTerm={searchTerm}
          isLoading={isLoading}
          handleAddCard={handleAddCard}
          setUrlInput={setUrlInput}
          setSearchTerm={setSearchTerm}
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

        {/* 🚨 [최적화] 카드 목록 또는 빈 목록 메시지를 렌더링합니다. */}
        {filteredCards.length > 0 ? (
          filteredCards.map(card => (
            <Card
              key={card.id}
              card={card}
              onDelete={handleDeleteCard}
              onNameChange={handleNameChange}
              onDescriptionChange={handleDescriptionChange} // [추가] 새로운 핸들러 전달
            />
          ))
        ) : (
          // 🚨 검색 결과가 없을 때 높이를 고정하여 DOM 변동을 최소화합니다.
          <div className="min-h-[100px] flex items-center justify-center">
            {cards.length === 0 && !isLoading ? (
              <p className="text-center text-gray-500">아직 추가된 빌드가 없습니다.</p>
            ) : (
              !isLoading && (
                <p className="text-center text-gray-500">'{searchTerm}'에 해당하는 빌드를 찾을 수 없습니다.</p>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
