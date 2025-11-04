'use client'; 

import { useState, useEffect, FormEvent, useCallback } from 'react';
// FIX: 경로 별칭 (@/) 대신 상대 경로 (../components/Card)를 사용하여 빌드 오류를 해결
import Card, { CardType } from '../components/Card'; 

// --- [분리] ClientForm에 필요한 Props 정의 ---
interface ClientFormProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  monsterFilters: string[];
  selectedMonsters: string[];
  handleMonsterFilterClick: (monsterName: string) => void;
  weaponTypeFilters: string[];
  selectedWeaponTypes: string[];
  handleWeaponTypeFilterClick: (weaponType: string) => void;
  monsterCounts: Record<string, number>;
  weaponTypeCounts: Record<string, number>;
  handleResetFilters: () => void;
}

// --- [분리] ClientForm 컴포넌트 정의 (Home 함수 밖으로 이동) ---
const ClientForm = ({
  searchTerm,
  setSearchTerm,
  monsterFilters,
  selectedMonsters,
  handleMonsterFilterClick,
  weaponTypeFilters,
  selectedWeaponTypes,
  handleWeaponTypeFilterClick,
  monsterCounts,
  weaponTypeCounts,
  handleResetFilters,
}: ClientFormProps) => (
  <>
    {/* 검색 입력창 */}
    <div className="mb-4">
      <input
        type="text"
        value={searchTerm}
        // [핵심] 상태 setter 함수를 직접 사용하여 단순화 (불필요한 로직 제거)
        onChange={(e) => setSearchTerm(e.target.value)} 
        placeholder="빌드명으로 검색하세요..."
        className="w-full border p-2 rounded-lg focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    {/* 몬스터 필터 버튼 */}
    <div className="mb-4 flex flex-wrap gap-2">
      {monsterFilters.map(monster => (
        (monsterCounts[monster] || 0) > 0 && (
          <button
            key={monster}
            onClick={() => handleMonsterFilterClick(monster)}
            className={`px-2 py-1 rounded-md flex items-center gap-1 text-sm font-semibold ${selectedMonsters.includes(monster) ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'}`}>
            {monster}
            <span className="text-xs">({monsterCounts[monster] || 0})</span>
          </button>
        )
      ))}
    </div>

    {/* 무기 종류 필터 버튼 */}
    <div className="mb-4 flex flex-wrap gap-2">
      {weaponTypeFilters.map(weaponType => (
        (weaponTypeCounts[weaponType] || 0) > 0 && (
          <button
            key={weaponType}
            onClick={() => handleWeaponTypeFilterClick(weaponType)}
            className={`px-2 py-1 rounded-md flex items-center gap-1 text-sm font-semibold ${selectedWeaponTypes.includes(weaponType) ? 'bg-yellow-900 text-white' : 'bg-yellow-700 text-white'}`}>
            {weaponType}
            <span className="text-xs">({weaponTypeCounts[weaponType] || 0})</span>
          </button>
        )
      ))}
      {(selectedMonsters.length > 0 || selectedWeaponTypes.length > 0) && (
        <button
          onClick={handleResetFilters}
          className="px-2 py-1 rounded-md flex items-center gap-1 text-sm font-semibold bg-red-500 text-white ml-auto">
          초기화
        </button>
      )}
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
  const [selectedMonsters, setSelectedMonsters] = useState<string[]>([]);
  const [selectedWeaponTypes, setSelectedWeaponTypes] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false); // 클라이언트 렌더링 확인

  // --- 파생 상태 (DERIVED STATE) ---
  const monsterFilters = [...new Set(cards.map(card => card.weaponBaseMonster).filter((m): m is string => !!m))];
  const weaponTypeFilters = [...new Set(cards.map(card => card.weaponType).filter((w): w is string => !!w))];

  const filteredCards = cards.filter(card => {
    const matchesSearchTerm = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonsterFilter = selectedMonsters.length === 0 || 
      (card.weaponBaseMonster && selectedMonsters.includes(card.weaponBaseMonster));

    const matchesWeaponTypeFilter = selectedWeaponTypes.length === 0 ||
      (card.weaponType && selectedWeaponTypes.includes(card.weaponType));

    return matchesSearchTerm && matchesMonsterFilter && matchesWeaponTypeFilter;
  });

  const monsterCounts = filteredCards.reduce((acc, card) => {
    if (card.weaponBaseMonster) {
      acc[card.weaponBaseMonster] = (acc[card.weaponBaseMonster] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const weaponTypeCounts = filteredCards.reduce((acc, card) => {
    if (card.weaponType) {
      acc[card.weaponType] = (acc[card.weaponType] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

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
        // createdAt이 없을 경우 id를 사용 (기존 데이터 호환성)
        const safeData = data.map(card => ({
            ...card,
            // description 필드가 없거나(DB 마이그레이션 중) null이면 ""을 할당
            description: card.description || "",
            // createdAt이 없으면 id를 등록날짜로 사용 (기존 데이터 호환성)
            createdAt: card.createdAt || card.id,
            weaponBaseMonster: card.weaponBaseMonster || card.monster || undefined,
            weaponType: card.weaponType || card.weapon || undefined,
        }));
        
        setCards(safeData);
        console.log(`--- [Client] loadCards: 카드 ${safeData.length}개 불러오기 성공.`);
        // 초기 로드 완료는 성공 시에만 표시하여 빈 배열 저장 방지
        setIsInitialLoad(false);
      } catch (error) {
        console.error("--- [Client] loadCards 실패:", error);
      
        let errorMessage = "알 수 없는 오류가 발생했습니다."; // Default message

        if (error instanceof Error) {
          // Now TypeScript knows 'error' has a 'message' property
          errorMessage = error.message; 
        }
        
        // 경고: Canvas 환경에서는 alert 대신 커스텀 UI를 사용하세요.
        alert(`[로드 실패] 카드 목록을 불러오는 데 실패했습니다: ${errorMessage}`);
        // 실패 시에는 초기 로드 상태를 유지하여 저장 이펙트가 실행되지 않게 함
      }
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
          const now = Date.now();
          const errorCard: CardType = {
            id: now,
            url: urlInput,
            screenshot: `data:image/png;base64,${errorData.debugScreenshotBase64}`,
            name: "⚠️ 스크린샷 실패 (디버그 화면)",
            description: "스크린샷 오류가 발생했습니다. 디버그 화면을 확인하세요.", // description 추가
            createdAt: now
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
        const now = Date.now();
        const newCard: CardType = {
          id: now,
          url: urlInput,
          screenshot: `data:image/png;base64,${data.screenshotBase64}`, 
          name: "새 빌드",
          description: "", // [추가] 새로운 카드를 만들 때 description 초기화
          createdAt: now,
          monster: data.monster || undefined,
          weapon: data.weapon || undefined,
          weaponBaseMonster: data.weaponBaseMonster || undefined,
          weaponType: data.weaponType || undefined,
          monsterIconUrl: data.monsterIconUrl || undefined,
          weaponTypeIconUrl: data.weaponTypeIconUrl || undefined
        };
        // [핵심] 함수형 업데이트 사용
        setCards(prevCards => [newCard, ...prevCards]); 
        setUrlInput("");
      }

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      // 경고: Canvas 환경에서는 alert 대신 커스텀 UI를 사용하세요。
      alert("오류가 발생했습니다: " + errorMessage);
    }

    setIsLoading(false);
  }, [urlInput, cards]); // 의존성: urlInput, cards

  // --- 카드 수정/삭제 핸들러 ---
  const handleDeleteCard = useCallback((id: number) => {
    // Card 컴포넌트에서 이미 확인 팝업이 있으므로 여기서는 바로 삭제
    // [핵심] 함수형 업데이트 사용
    setCards(prevCards => prevCards.filter(card => card.id !== id));
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

  const handleMonsterFilterClick = (monsterName: string) => {
    setSelectedMonsters(prevSelected => {
      if (prevSelected.includes(monsterName)) {
        return prevSelected.filter(m => m !== monsterName);
      } else {
        return [...prevSelected, monsterName];
      }
    });
  };

  const handleWeaponTypeFilterClick = (weaponType: string) => {
    setSelectedWeaponTypes(prevSelected => {
      if (prevSelected.includes(weaponType)) {
        return prevSelected.filter(w => w !== weaponType);
      } else {
        return [...prevSelected, weaponType];
      }
    });
  };

  const handleResetFilters = () => {
    setSelectedMonsters([]);
    setSelectedWeaponTypes([]);
  };

  // --- 최종 렌더링 (RETURN) ---
  return (
    <main 
      className="container mx-auto p-4 max-w-7xl"
      suppressHydrationWarning={true}
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold mr-4">MHNB</h1>
        <form onSubmit={handleAddCard} className="flex gap-2 flex-grow">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://mhn.quest 빌드 링크를 붙여넣으세요"
            className="flex-grow border p-2 rounded-lg"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? '생성 중...' : '추가'}
          </button>
        </form>
      </div>

      {/* 1. isClient 상태에 따라 폼을 조건부 렌더링 */}
      {isClient ? 
        <ClientForm 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          monsterFilters={monsterFilters}
          selectedMonsters={selectedMonsters}
          handleMonsterFilterClick={handleMonsterFilterClick}
          weaponTypeFilters={weaponTypeFilters}
          selectedWeaponTypes={selectedWeaponTypes}
          handleWeaponTypeFilterClick={handleWeaponTypeFilterClick}
          monsterCounts={monsterCounts}
          weaponTypeCounts={weaponTypeCounts}
          handleResetFilters={handleResetFilters}
        /> 
        : (
        <div className="h-24 mb-8 flex justify-center items-center text-gray-500">
          UI 로딩 중...
        </div>
      )}
      
      {/* 2. 카드 목록이 표시될 공간 (반응형 그리드 레이아웃) */}
      <div>
        {/* 로딩 상태 표시 */}
        {isLoading && (
          <p className="text-center text-blue-500 mb-6">
            스크린샷을 생성 중입니다...
          </p>
        )}

        {/* 🚨 [최적화] 카드 목록 또는 빈 목록 메시지를 렌더링합니다. */}
        {filteredCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-start">
            {filteredCards.map(card => (
              <Card
                key={card.id}
                card={card}
                onDelete={handleDeleteCard}
                onNameChange={handleNameChange}
                onDescriptionChange={handleDescriptionChange} // [추가] 새로운 핸들러 전달
              />
            ))}
          </div>
        ) : (
          // 🚨 검색 결과가 없을 때 높이를 고정하여 DOM 변동을 최소화합니다.
          <div className="min-h-[100px] flex items-center justify-center">
            {cards.length === 0 && !isLoading ? (
              <p className="text-center text-gray-500">아직 추가된 빌드가 없습니다.</p>
            ) : (
              !isLoading && (
                <p className="text-center text-gray-500">&apos;{searchTerm}&apos;에 해당하는 빌드를 찾을 수 없습니다.</p>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
