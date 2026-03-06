import Navbar from './Navbar';

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      {/* 💡 미나의 핵심 마법: 여기에 지붕(Navbar)을 달아두면, 게시판이든 글쓰기든 글읽기든 무조건 위에 따라붙습니다! */}
      <Navbar />
      
      {/* 이 아래로 글쓰기 화면, 게시판 화면 등이 쏙쏙 교체되어 들어옵니다 */}
      {children}
    </div>
  );
}