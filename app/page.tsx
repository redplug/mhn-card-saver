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

  // '추가' 버튼을 눌렀을 때 실행될 함수 (지금은 비워둡니다)
// app/page.tsx 파일의 handleAddCard 함수 부분

  const handleAddCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 페이지 새로고침 방지
    if (!urlInput) return; // URL이 비어있으면 중단

    setIsLoading(true); // 로딩 시작!

    try {
      // 3단계에서 만든 API(/api/screenshot)를 호출합니다.
      // ?url=... 뒤에 사용자가 입력한 URL을 붙여서 보냅니다.
      const res = await fetch(`/api/screenshot?url=${encodeURIComponent(urlInput)}`);

      if (!res.ok) {
        // API가 실패하면, API가 보낸 JSON 에러 메시지를 읽습니다.
        const errorData = await res.json();
        // API의 catch 블록에 있는 'details' 메시지를 가져옵니다.
        throw new Error(errorData.details || '스크린샷 생성에 실패했습니다.');
      }

      if (!res.ok) { // API가 에러를 반환하면
        throw new Error('스크린샷 생성에 실패했습니다.');
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
    <main className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-center">MHN 빌드 세이버</h1>

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

      {/* 카드 목록이 표시될 공간 */}
      <div className="space-y-6">
        {/* isLoading이 true이면 로딩 메시지를 보여줍니다. */}
        {isLoading && (
          <p className="text-center text-blue-500">
            스크린샷을 생성 중입니다... (최대 10초 소요)
          </p>
        )}

        {/* cards 배열을 순회하며 Card 컴포넌트를 그립니다. */}
        {cards.map(card => (
          <Card
            key={card.id} // React가 각 카드를 구분하기 위한 고유 키
            card={card}
            onDelete={handleDeleteCard}
            onNameChange={handleNameChange}
          />
        ))}

        {cards.length === 0 && !isLoading && (
          <p className="text-center text-gray-500">아직 추가된 빌드가 없습니다.</p>
        )}
      </div>
    </main>
  );
}