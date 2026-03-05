import { sql } from '@vercel/postgres';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(dateString: any) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default async function BoardPage(props: any) {
  // 💡 미나의 마법 1: 주소창에 '베스트 조건'이 있는지 확인합니다!
  const searchParams = await props.searchParams;
  const bestCount = searchParams.best ? Number(searchParams.best) : 0;

  let posts;
  
  // 💡 미나의 마법 2: 베스트 조건이 있으면 '그 숫자 이상 추천받은 글'만 창고에서 꺼내옵니다!
  if (bestCount > 0) {
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestCount} ORDER BY date DESC`;
    posts = rows;
  } else {
    // 조건이 없으면 평소처럼 다 꺼내옵니다.
    const { rows } = await sql`SELECT * FROM posts ORDER BY date DESC`;
    posts = rows;
  }

  // 💡 장식이었던 메뉴에 진짜 링크(길)를 뚫어줍니다! (백베스트는 3개, 천베스트는 5개로 테스트 셋팅!)
  const menus = [
    { name: '💯 백베스트', link: '/board?best=3' }, 
    { name: '👑 천베스트', link: '/board?best=5' },
    { name: '투데이 베스트', link: '/board' },
    { name: '전체글 보기', link: '/board' },
    { name: '유머', link: '/board' },
    { name: '감동', link: '/board' },
    { name: '공포', link: '/board' },
    { name: '일상', link: '/board' },
    { name: '그냥 혼잣말', link: '/board' },
    { name: '핫뉴스', link: '/board' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-[#3b4890]">OJEMI</Link>
        </div>
      </header>

      <nav className="bg-[#3b4890] text-gray-300 relative z-40">
        <div className="max-w-5xl mx-auto flex flex-wrap relative">
          {menus.map((menu) => (
            // 💡 이제 메뉴를 클릭하면 설정해둔 링크로 슝~ 이동합니다!
            <Link href={menu.link} key={menu.name} className="relative group px-4 py-3 cursor-pointer block">
              <span className="font-bold text-sm group-hover:text-white transition-colors">
                {menu.name}
              </span>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0 hidden group-hover:block z-50">
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-transparent border-b-white mx-auto"></div>
                <div className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 border border-gray-300 shadow-lg whitespace-nowrap rounded-sm">
                  {menu.name} 바로가기
                </div>
              </div>
            </Link>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            {/* 💡 베스트 게시판에 들어오면 제목이 멋지게 바뀝니다! */}
            <h2 className="text-xl font-bold text-gray-800">
              {bestCount > 0 ? `🏆 명예의 전당 (추천 ${bestCount}개 이상 명품글)` : '전체글 보기'}
            </h2>
            <Link href="/board/write" className="px-6 py-2 bg-[#3b4890] text-white rounded font-bold hover:bg-[#222b5c] shadow-md transition-colors">
              ✍️ 폼나게 글쓰기
            </Link>
          </div>

          <div className="flex bg-gray-50 border-t border-b border-gray-200 py-3 text-sm font-bold text-gray-600 text-center">
            <div className="w-16">번호</div>
            <div className="flex-1">제목</div>
            <div className="w-24">글쓴이</div>
            <div className="w-16 text-blue-600">추천</div>
            <div className="w-20">조회수</div>
            <div className="w-32">날짜</div>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">아직 조건을 만족하는 명품 글이 없습니다. 분발하세요!</div>
          ) : (
            posts.map((post) => (
              <Link href={`/board/${post.id}`} key={post.id} className="flex border-b border-gray-100 py-3 text-sm hover:bg-gray-50 items-center text-center cursor-pointer transition-colors group">
                <div className="w-16 text-gray-400">{post.id}</div>
                <div className="flex-1 text-left px-4 font-semibold text-gray-800 group-hover:text-[#3b4890] group-hover:underline">
                  {post.title}
                </div>
                <div className="w-24 text-gray-600 font-bold">{post.author}</div>
                <div className="w-16 text-blue-600 font-extrabold">{post.likes || 0}</div>
                <div className="w-20 text-red-500 font-bold">{post.views || 0}</div>
                <div className="w-32 text-gray-400">{formatDate(post.date)}</div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}