import { sql } from '@vercel/postgres';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(dateString: any) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default async function BoardPage(props: any) {
  const searchParams = await props.searchParams;
  const bestCount = searchParams.best ? Number(searchParams.best) : 0;
  
  // 💡 미나의 마법 1: 주소창에 '검색어(q)'가 날아왔는지 확인합니다!
  const keyword = searchParams.q || ''; 

  let posts;
  
  // 💡 미나의 마법 2: 검색어가 있으면 제목이나 글쓴이에 그 단어가 들어간 글만 찾아옵니다! 
  // (ILIKE 는 대소문자 구별 없이 귀신같이 찾아내는 주문입니다!)
  if (keyword && bestCount > 0) {
    // 명예의 전당 안에서 검색할 때
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestCount} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) ORDER BY date DESC`;
    posts = rows;
  } else if (keyword) {
    // 전체 게시판에서 검색할 때
    const { rows } = await sql`SELECT * FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'} ORDER BY date DESC`;
    posts = rows;
  } else if (bestCount > 0) {
    // 검색어 없이 명예의 전당만 볼 때
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestCount} ORDER BY date DESC`;
    posts = rows;
  } else {
    // 평소 전체글 볼 때
    const { rows } = await sql`SELECT * FROM posts ORDER BY date DESC`;
    posts = rows;
  }

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

      <main className="max-w-5xl mx-auto p-4 mt-4 mb-20">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            {/* 💡 검색을 하면 제목이 'O 검색 결과'로 센스 있게 바뀝니다! */}
            <h2 className="text-xl font-bold text-gray-800">
              {keyword ? `🔍 '${keyword}' 검색 결과 (${posts.length}건)` : (bestCount > 0 ? `🏆 명예의 전당 (추천 ${bestCount}개 이상)` : '전체글 보기')}
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
            <div className="text-center py-10 text-gray-500">
              {keyword ? '검색된 명품 글이 없습니다. 다른 단어로 찾아보세요!' : '아직 조건을 만족하는 명품 글이 없습니다.'}
            </div>
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

          {/* 💡 디씨인사이드처럼 게시판 맨 아래에 달린 깔끔한 검색창! */}
          <div className="mt-8 flex justify-center">
            <form action="/board" method="GET" className="flex gap-2">
              {bestCount > 0 && <input type="hidden" name="best" value={bestCount} />}
              
              <select className="p-2 border border-gray-300 rounded focus:outline-[#3b4890] text-sm text-gray-600 font-bold bg-white outline-none cursor-pointer">
                <option value="all">제목 + 글쓴이</option>
              </select>
              
              <input 
                name="q" 
                defaultValue={keyword}
                placeholder="검색어를 입력하세요" 
                className="p-2 border border-gray-300 rounded w-64 focus:outline-[#3b4890] text-sm outline-none"
                required
              />
              
              <button type="submit" className="px-6 py-2 bg-[#3b4890] text-white rounded font-bold hover:bg-[#222b5c] transition-colors text-sm shadow-sm">
                🔍 검색
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}