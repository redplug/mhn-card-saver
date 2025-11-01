'use client'; 

import { useState, useEffect, FormEvent } from 'react';
import Card from '@/components/Card';

export type CardType = {
  id: number;
  url: string;
  screenshot: string;
  name: string;
};

export default function Home() {
  // --- 상태 관리 (STATE) ---
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<CardType[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [isClient, setIsClient] = useState(false); // 클라이언트 렌더링 확인

  // --- 파생 상태 (DERIVED STATE) ---
  // cards 상태와 searchTerm 상태가 바뀔 때마다 필터링됩니다.
  const filteredCards = cards.filter(card => 
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- DB 로드 (EFFECT) ---
  useEffect(() => {
    setIsClient(true); // 클라이언트 마운트 완료 (하이드레이션 오류 우회)
    async function loadCards() {
      console.log("--- [Client] loadCards: 카드 불러오기 시작...");
      try {
        const res = await fetch('/api/cards');
        if (!res.ok) {
          throw new Error(`API가 에러를 반환했습니다: ${res.status}`);
        }
        const data = await res.json();
        setCards(data);
        console.log(`--- [Client] loadCards: 카드 ${data.length}개 불러오기 성공.`);
      } catch (error) {
        console.error("--- [Client] loadCards 실패:", error);
        alert(`[로드 실패] 카드 목록을 불러오는 데 실패했습니다: ${error.message}`);
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
        alert(`[저장 실패] 카드 목록을 저장하는 데 실패했습니다: ${error.message}`);
      }
    }
    
    saveCardsToDB();
    
  }, [cards, isInitialLoad]);

  // --- 카드 추가 핸들러 (HANDLER) ---
  const handleAddCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!urlInput) return;

    // 1. 중복 체크 로직
    const isDuplicate = cards.some(card => card.url === urlInput);
    if (isDuplicate) {
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
            name: "⚠️ 스크린샷 실패 (디버그 화면)"
          };
          setCards([errorCard, ...cards]);
          setIsLoading(false);
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
        };
        setCards([newCard, ...cards]); 
        setUrlInput("");
      }

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert("오류가 발생했습니다: " + errorMessage);
    }

    setIsLoading(false);
  };

  // --- 카드 수정/삭제 핸들러 ---
  const handleDeleteCard = (id: number) => {
    const isConfirmed = window.confirm(`정말로 이 빌드를 삭제하시겠습니까?`);
    if (isConfirmed) {
      setCards(cards.filter(card => card.id !== id));
    }
  };

  const handleNameChange = (id: number, newName: string) => {
    setCards(cards.map(card => 
      card.id === id ? { ...card, name: newName } : card
    ));
  };
  
  // --- 클라이언트 렌더링 폼 (COMPONENT) ---
  // 하이드레이션 오류 방지를 위해 폼과 인풋은 클라이언트에서만 렌더링합니다.
  const ClientForm = () => (
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
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="빌드명으로 검색하세요..."
          className="w-full border p-3 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </>
  );

  // --- 최종 렌더링 (RETURN) ---
  return (
    <main 
      className="container mx-auto p-4 max-w-3xl"
      suppressHydrationWarning={true}
    >
      <h1 className="text-3xl font-bold mb-6 text-center">MHN 빌드 세이버</h1>

      {/* 1. isClient 상태에 따라 폼을 조건부 렌더링 */}
      {isClient ? <ClientForm /> : (
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

        {/* 필터링된 카드 목록 렌더링 */}
        {filteredCards.map(card => (
          <Card
            key={card.id}
            card={card}
            onDelete={handleDeleteCard}
            onNameChange={handleNameChange}
          />
        ))}
        
        {/* 빈 목록 메시지 */}
        {cards.length === 0 && !isLoading && (
          <p className="text-center text-gray-500">아직 추가된 빌드가 없습니다.</p>
        )}
        {cards.length > 0 && filteredCards.length === 0 && !isLoading && (
          <p className="text-center text-gray-500">'{searchTerm}'에 해당하는 빌드를 찾을 수 없습니다.</p>
        )}
      </div>
    </main>
  );
}
