// app/page.tsx

// 'use client'는 이 페이지가 사용자의 '브라우저'에서 동작해야 함을 알립니다.
// (버튼 클릭, 글자 입력 등을 처리하기 위해 필수)
'use client'; 

// React에서 '상태'를 관리하기 위한 도구(useState)를 가져옵니다.
// import { useState } from 'react';
import { useState, useEffect, FormEvent } from 'react';
import Card from '@/components/Card'; // <-- 이 줄 추가

export type CardType = {
  id: number;
  url: string;
  screenshot: string;
  name: string;
};

// 이 페이지의 메인 컴포넌트(내용물)입니다.
export default function Home() {

  // React의 '상태' (메모리 박스) 만들기
  // 1. urlInput: 사용자가 입력창에 적는 URL을 저장할 공간
  // 2. cards: 생성된 카드 목록을 저장할 공간 (배열)
  // 3. isLoading: 스크린샷 생성 중인지(로딩 중인지) 확인할 공간
  const [urlInput, setUrlInput] = useState("");
  // const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<CardType[]>([]);
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // ⬇️ [추가] 검색어 상태 관리 ⬇️
  const [searchTerm, setSearchTerm] = useState(""); 
  
  // ⬇️ [추가] 필터링된 카드 목록 계산 ⬇️
  // cards 상태와 searchTerm 상태가 바뀔 때마다 실행됩니다.
  const filteredCards = cards.filter(card => 
    // 카드 이름(name)을 소문자로 변환하여 검색어가 포함되어 있는지 확인합니다.
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ⬇️ [추가] 클라이언트가 로드되었는지 확인하는 상태 ⬇️
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
      setIsInitialLoad(false); // 로딩 완료!
    }
    
    loadCards();
  }, []); // [] : 이 훅은 페이지가 처음 켜질 때 딱 한 번만 실행됨

  // 4. [수정] 'cards' 상태가 '변경'될 때마다 'DB'에 '저장'하는 훅
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

  // '추가' 버튼을 눌렀을 때 실행될 함수 (지금은 비워둡니다)
// app/page.tsx 파일의 handleAddCard 함수 부분
 
  const handleAddCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 페이지 새로고침 방지
    if (!urlInput) return; // URL이 비어있으면 중단
   // 내용 추가  

    // --- ⬇️ 1. [핵심 추가] 중복 체크 로직 ⬇️ ---
    const isDuplicate = cards.some(card => card.url === urlInput);

    if (isDuplicate) {
      alert("이미 추가된 빌드 주소입니다! 중복된 주소는 추가할 수 없습니다.");
      setUrlInput("");
      return; // 중복이므로 함수 실행을 중단합니다.
    }
    // --- ⬆️ 중복 체크 로직 끝 ⬆️ ---

    setIsLoading(true); // 로딩 시작!

    try {
      
      // 3단계에서 만든 API(/api/screenshot)를 호출합니다.
      // ?url=... 뒤에 사용자가 입력한 URL을 붙여서 보냅니다.
      const res = await fetch(`/api/screenshot?url=${encodeURIComponent(urlInput)}`);

      if (!res.ok) {
        const errorData = await res.json();
        
        // 1. API가 보낸 JSON에 'debugScreenshotBase64'가 있는지 확인합니다.
        if (errorData.debugScreenshotBase64) {
          // 2. "에러 디버그 카드"를 생성합니다.
          const errorCard: CardType = {
            id: Date.now(),
            url: urlInput,
            screenshot: `data:image/png;base64,${errorData.debugScreenshotBase64}`,
            name: "⚠️ 스크린샷 실패 (디버그 화면)"
          };
          setCards([errorCard, ...cards]); // 카드 목록에 추가
          setIsLoading(false);
          alert(`오류: 스크린샷 영역을 찾지 못했습니다. 무엇이 보이는지 디버그 카드를 확인해주세요.`);
          return; // 함수 종료
        }

        // 3. 디버그 스크린샷이 없으면, 기존처럼 에러 메시지를 띄웁니다.
        const message = errorData.error || errorData.details || '스크린샷 생성에 실패했습니다.';
        throw new Error(message);
      }

      const data = await res.json(); // API가 보내준 JSON 데이터를 받음

      if (data.screenshotBase64) {
        // 성공 시, 새 카드 객체를 만듭니다.
        const newCard: CardType = {
          id: Date.now(), // 고유한 ID (현재 시간)
          url: urlInput,
          // 'data:image/png;base64,' 이걸 붙여야 이미지로 인식됩니다.
          screenshot: `data:image/png;base64,${data.screenshotBase64}`, 
          name: "새 빌드", // 초기 빌드명
        };

        // 'cards' 상태(메모리 박스)에 새 카드를 추가합니다.
        // ...cards는 "기존 카드 목록"을 의미합니다.
        setCards([newCard, ...cards]); 
        setUrlInput(""); // 입력창 비우기
      }

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert("오류가 발생했습니다: " + errorMessage);
    }

    setIsLoading(false); // 로딩 끝!
  };

  // 카드 삭제 함수
  const handleDeleteCard = (id: number) => {
    // "삭제하려는 id와 다른 id를 가진 카드만 남겨주세요."
    setCards(cards.filter(card => card.id !== id));
  };

  // 빌드명 변경 함수
  const handleNameChange = (id: number, newName: string) => {
    // "카드 목록(cards)을 돌면서, id가 일치하는 카드를 찾으면
    // 그 카드의 name만 newName으로 바꿔주세요."
    setCards(cards.map(card => 
      card.id === id ? { ...card, name: newName } : card
    ));
  };
  
  // 화면에 보여줄 HTML 코드입니다.
  return (
    <main 
      className="container mx-auto p-4 max-w-3xl"
      // 외부 확장 프로그램으로 인한 오류를 무시합니다.
      suppressHydrationWarning={true}
    >
      <h1 className="text-3xl font-bold mb-6 text-center">MHN 빌드 세이버</h1>
      {/* ⬇️ [핵심 수정] isClient가 true일 때만 폼을 렌더링 ⬇️ */}
      {isClient ? <ClientForm /> : (
        <div className="h-24 mb-8 flex justify-center items-center text-gray-500">
          UI 로딩 중...
        </div>
      )}
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
        
      ;
      {/* 카드 목록이 표시될 공간 */}
      <div className="space-y-6">
        {/* 1. 로딩 상태 표시 */}
        {isLoading && (
          <p className="text-center text-blue-500">
            스크린샷을 생성 중입니다...
          </p>
        )}

        {/* 2. 필터링된 카드 목록 렌더링 */}
        {filteredCards.map(card => ( // ⚠️ [수정] cards 대신 filteredCards를 사용합니다.
          <Card
            key={card.id}
            card={card}
            onDelete={handleDeleteCard}
            onNameChange={handleNameChange}
          />
        ))}
        
        {/* 3. 빈 목록 메시지 */}
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