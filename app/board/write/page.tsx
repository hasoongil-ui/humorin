import Link from 'next/link';

export default function WritePost() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      {/* 오재미 통합 헤더 (오유 스타일) */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-3xl font-extrabold text-blue-600 tracking-tighter cursor-pointer hover:text-blue-800 transition">
            <Link href="/">OJEMI</Link>
          </div>
          <div className="space-x-3">
            <button className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">로그인</button>
            <button className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
              회원가입
            </button>
          </div>
        </div>

        <div className="bg-blue-600 text-white text-sm font-medium">
          <div className="max-w-6xl mx-auto px-6 py-0 flex items-center overflow-x-auto whitespace-nowrap hide-scrollbar">
            <Link href="#" className="py-3 px-4 bg-blue-800 hover:bg-blue-900 transition flex items-center space-x-1">
              <span>💯</span><span>백베스트</span>
            </Link>
            <Link href="#" className="py-3 px-4 bg-yellow-500 text-yellow-900 hover:bg-yellow-400 transition flex items-center space-x-1 font-bold">
              <span>👑</span><span>천베스트</span>
            </Link>
            
            <div className="h-4 w-px bg-blue-400 mx-2"></div>
            <Link href="#" className="py-3 px-3 hover:bg-blue-500 transition">투데이 베스트</Link>
            <Link href="/board" className="py-3 px-3 hover:bg-blue-500 transition">전체글 보기</Link>
            <div className="h-4 w-px bg-blue-400 mx-2"></div>
            <Link href="#" className="py-3 px-3 hover:bg-blue-500 transition text-yellow-200">유머</Link>
            <Link href="#" className="py-3 px-3 hover:bg-blue-500 transition">감동</Link>
            <Link href="#" className="py-3 px-3 hover:bg-blue-500 transition">공포</Link>
            <Link href="#" className="py-3 px-3 hover:bg-blue-500 transition">일상</Link>
            <Link href="#" className="py-3 px-3 hover:bg-blue-500 transition">그냥 혼잣말</Link>
            <Link href="#" className="py-3 px-3 hover:bg-blue-500 transition font-bold text-red-200">핫뉴스</Link>
          </div>
        </div>
      </header>

      {/* 글쓰기 메인 영역 */}
      <main className="max-w-4xl mx-auto mt-10 px-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <span className="text-blue-600 mr-2">✍️</span> 게시물 작성
        </h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* 게시판 선택 & 제목 */}
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
              <select className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700 w-full md:w-1/4">
                <option>게시판 선택</option>
                <option>유머</option>
                <option>감동</option>
                <option>공포</option>
                <option>일상</option>
                <option>그냥 혼잣말</option>
                <option>핫뉴스</option>
              </select>
              <input 
                type="text" 
                placeholder="제목을 입력해 주세요." 
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:w-3/4"
              />
            </div>

            {/* 🌟 명품 에디터 영역 🌟 */}
            <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
              
              {/* 에디터 툴바 */}
              <div className="bg-gray-50 border-b border-gray-300 px-4 py-3 flex items-center space-x-5 overflow-x-auto whitespace-nowrap">
                <button className="flex items-center text-gray-700 hover:text-blue-600 transition font-bold text-sm">
                  <span className="text-lg mr-1">🖼️</span> 사진
                </button>
                <button className="flex items-center text-gray-700 hover:text-blue-600 transition font-bold text-sm">
                  <span className="text-lg mr-1">🎬</span> 영상
                </button>
                <div className="h-5 w-px bg-gray-300"></div>
                <button className="font-extrabold text-gray-700 hover:text-black transition" title="굵게">B</button>
                <button className="italic font-serif text-gray-700 hover:text-black transition" title="기울임">I</button>
                <button className="underline text-gray-700 hover:text-black transition" title="밑줄">U</button>
                <button className="line-through text-gray-700 hover:text-black transition" title="취소선">S</button>
                <div className="h-5 w-px bg-gray-300"></div>
                <button className="text-gray-700 hover:text-black transition flex items-center text-sm font-medium" title="글자색">
                  <span className="w-4 h-4 rounded-full bg-red-500 inline-block mr-1 border border-gray-300"></span> 색상
                </button>
              </div>
              
              {/* 본문 작성 칸 */}
              <textarea 
                placeholder="내용을 입력해 주세요. 툴바의 사진 아이콘을 눌러 본문 중간에 이미지를 삽입할 수 있습니다." 
                className="w-full px-5 py-5 h-96 focus:outline-none resize-none text-gray-800 leading-relaxed"
              ></textarea>
            </div>

            {/* 일반 첨부파일 영역 */}
            <div className="flex items-center border border-gray-200 rounded-lg p-3 bg-gray-50">
              <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm text-sm hover:bg-gray-50 transition">
                📎 파일 첨부
              </button>
              <span className="text-sm text-gray-400 ml-3">일반 첨부파일을 여기에 추가하세요. (최대 10MB)</span>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <Link href="/board" className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition">
              취소
            </Link>
            <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-md">
              등록
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}