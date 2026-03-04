export default function Board() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white flex justify-between items-center p-6 border-b border-gray-200 shadow-sm sticky top-0">
        <div className="text-2xl font-extrabold text-blue-600 tracking-tighter cursor-pointer hover:text-blue-800 transition">
          <a href="/">OJEMI</a>
        </div>
        <nav className="space-x-6 font-medium text-gray-600">
          <a href="/board" className="text-blue-600 border-b-2 border-blue-600 pb-1">자유게시판</a>
          <span className="cursor-pointer hover:text-gray-900">질문/답변</span>
          <span className="cursor-pointer hover:text-gray-900">갤러리</span>
        </nav>
        <button className="text-sm font-medium bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition">
          글쓰기
        </button>
      </header>

      {/* 게시판 메인 영역 */}
      <main className="max-w-5xl mx-auto mt-12 px-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold">자유게시판</h1>
            <p className="text-gray-500 mt-2">오재미 회원들과 자유롭게 소통하는 공간입니다.</p>
          </div>
          <div className="flex space-x-2">
            <input type="text" placeholder="검색어를 입력하세요" className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">검색</button>
          </div>
        </div>

        {/* 게시글 목록 (테이블) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                <th className="py-4 px-6 font-medium w-16 text-center">번호</th>
                <th className="py-4 px-6 font-medium">제목</th>
                <th className="py-4 px-6 font-medium w-32 text-center">작성자</th>
                <th className="py-4 px-6 font-medium w-24 text-center">조회</th>
                <th className="py-4 px-6 font-medium w-32 text-center">작성일</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {/* 게시글 1 */}
              <tr className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer">
                <td className="py-4 px-6 text-center text-blue-600 font-bold">공지</td>
                <td className="py-4 px-6 font-medium text-gray-900">오재미 커뮤니티 이용 규칙 안내</td>
                <td className="py-4 px-6 text-center">운영자</td>
                <td className="py-4 px-6 text-center">1,204</td>
                <td className="py-4 px-6 text-center text-gray-400">03.04</td>
              </tr>
              {/* 게시글 2 */}
              <tr className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer">
                <td className="py-4 px-6 text-center text-gray-400">3</td>
                <td className="py-4 px-6">드디어 나만의 커뮤니티가 생겼네요! 너무 좋습니다. <span className="text-blue-500 text-xs ml-1">[5]</span></td>
                <td className="py-4 px-6 text-center">하순길대표</td>
                <td className="py-4 px-6 text-center">45</td>
                <td className="py-4 px-6 text-center text-gray-400">10:24</td>
              </tr>
              {/* 게시글 3 */}
              <tr className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer">
                <td className="py-4 px-6 text-center text-gray-400">2</td>
                <td className="py-4 px-6">요즘 주식 시장 어떻게 보시나요?</td>
                <td className="py-4 px-6 text-center">투자왕</td>
                <td className="py-4 px-6 text-center">88</td>
                <td className="py-4 px-6 text-center text-gray-400">09:15</td>
              </tr>
              {/* 게시글 4 */}
              <tr className="hover:bg-gray-50 transition cursor-pointer">
                <td className="py-4 px-6 text-center text-gray-400">1</td>
                <td className="py-4 px-6">가입 인사 드립니다. 잘 부탁드려요~</td>
                <td className="py-4 px-6 text-center">뉴비</td>
                <td className="py-4 px-6 text-center">12</td>
                <td className="py-4 px-6 text-center text-gray-400">어제</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* 페이징 (페이지 번호) */}
        <div className="flex justify-center mt-8 space-x-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold shadow-md">1</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition">2</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition">3</button>
        </div>
      </main>
    </div>
  );
}