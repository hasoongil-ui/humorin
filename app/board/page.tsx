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
  const keyword = searchParams.q || ''; 
  
  // 💡 미나의 마법 1: 지금 몇 페이지에 있는지 확인하고, 한 페이지에 5개씩만 보여주라고 지시합니다!
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const limit = 5; // 한 페이지에 보여줄 글 개수 (테스트용 5개!)
  const offset = (page - 1) * limit; // 창고에서 몇 번째 글부터 꺼낼지 계산하는 마법

  let posts;
  let totalCount = 0; // 전체 글이 몇 개인지 세어둘 변수
  
  // 💡 미나의 마법 2: 글을 가져올 때 '몇 개만(LIMIT)' 가져오라고 똑똑하게 명령합니다!
  if (keyword && bestCount > 0) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= ${bestCount} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'})`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestCount} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (keyword) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (bestCount > 0) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= ${bestCount}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestCount} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) FROM posts`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }

  // 전체 페이지 개수 계산 (예: 글이 12개면 3페이지가 필요함)
  const totalPages = Math.ceil(totalCount / limit) || 1;

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
              <span className="font-bold text-sm group-hover:text-white transition-colors">{menu.name}</span>
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
            <h2 className="text-xl font-bold text-gray-800">
              {keyword ? `🔍 '${keyword}' 검색 결과 (${totalCount}건)` : (bestCount > 0 ? `🏆 명예의 전당 (추천 ${bestCount}개 이상)` : '전체글 보기')}
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
              {keyword ? '검색된 명품 글이 없습니다.' : '아직 등록된 명품 글이 없습니다.'}
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

          {/* 💡 대망의 페이징(페이지 번호) 구역! 디씨인사이드처럼 예쁘게 달아줍니다. */}
          <div className="flex justify-center items-center gap-2 mt-8">
            {page > 1 && (
              <Link href={`/board?page=${page - 1}${keyword ? `&q=${keyword}` : ''}${bestCount > 0 ? `&best=${bestCount}` : ''}`} className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 font-bold text-sm">
                &lt; 이전
              </Link>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link 
                key={p} 
                href={`/board?page=${p}${keyword ? `&q=${keyword}` : ''}${bestCount > 0 ? `&best=${bestCount}` : ''}`}
                className={`px-3 py-1 border rounded font-bold text-sm transition-colors ${page === p ? 'bg-[#3b4890] text-white border-[#3b4890]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                {p}
              </Link>
            ))}

            {page < totalPages && (
              <Link href={`/board?page=${page + 1}${keyword ? `&q=${keyword}` : ''}${bestCount > 0 ? `&best=${bestCount}` : ''}`} className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 font-bold text-sm">
                다음 &gt;
              </Link>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <form action="/board" method="GET" className="flex gap-2">
              {bestCount > 0 && <input type="hidden" name="best" value={bestCount} />}
              <select className="p-2 border border-gray-300 rounded focus:outline-[#3b4890] text-sm text-gray-600 font-bold bg-white outline-none cursor-pointer">
                <option value="all">제목 + 글쓴이</option>
              </select>
              <input name="q" defaultValue={keyword} placeholder="검색어를 입력하세요" className="p-2 border border-gray-300 rounded w-64 focus:outline-[#3b4890] text-sm outline-none" required />
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