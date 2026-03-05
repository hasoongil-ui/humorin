import { sql } from '@vercel/postgres';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(dateString: any) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  
  // 오늘 올라온 글은 '14:30' 처럼 시간만, 예전 글은 '2026-03-05' 처럼 날짜만 보여주는 클리앙 디테일!
  if (isToday) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 본문에 사진이 있는지 확인하는 판독기 (아이콘 표시용)
function hasImage(content: string) {
  if (!content) return false;
  return /<img[^>]+src="([^">]+)"/.test(content);
}

export default async function BoardPage(props: any) {
  const searchParams = await props.searchParams;
  const bestType = searchParams.best || ''; 
  const category = searchParams.category || 'all';
  const keyword = searchParams.q || ''; 
  const page = searchParams.page ? Number(searchParams.page) : 1;
  
  // 리스트형이므로 한 페이지에 20개씩 넉넉하게 보여줍니다!
  const limit = 20; 
  const offset = (page - 1) * limit; 

  let posts = [];
  let totalCount = 0; 
  let topPost = null;

  // 💡 마법 1: 특정 게시판에 들어왔을 때, 1페이지면 '오늘의 장원(가장 추천 많은 글)'을 1개 뽑아옵니다!
  if (category !== 'all' && !keyword && bestType === '' && page === 1) {
    const { rows: topRows } = await sql`
      SELECT * FROM posts 
      WHERE category = ${category} 
      AND date >= NOW() - INTERVAL '1 day' 
      AND likes > 0 
      ORDER BY likes DESC, views DESC 
      LIMIT 1
    `;
    if (topRows.length > 0) {
      topPost = topRows[0];
    }
  }

  // 💡 마법 2: 투데이 베스트 (최근 24시간, 추천 10개 이상, 추천순 정렬)
  if (bestType === 'today') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE date >= NOW() - INTERVAL '1 day' AND likes >= 10`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE date >= NOW() - INTERVAL '1 day' AND likes >= 10 ORDER BY likes DESC, views DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } 
  // 기존 백베스트, 천베스트 유지
  else if (bestType === '3' || bestType === '5') {
    const bestNum = Number(bestType);
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= ${bestNum}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestNum} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } 
  // 검색 + 카테고리
  else if (keyword && category !== 'all') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE category = ${category} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'})`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE category = ${category} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } 
  // 검색 (전체)
  else if (keyword) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } 
  // 카테고리 (게시판별)
  else if (category !== 'all') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE category = ${category}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE category = ${category} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } 
  // 전체글 보기
  else {
    const countResult = await sql`SELECT COUNT(*) FROM posts`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // topPost가 일반 리스트에도 중복으로 나오지 않게 필터링!
  const renderPosts = topPost ? posts.filter((p: any) => p.id !== topPost.id) : posts;

  const menus = [
    { name: '🔥 투데이 베스트', link: '/board?best=today' },
    { name: '전체글 보기', link: '/board' },
    { name: '유머', link: '/board?category=유머' },
    { name: '감동', link: '/board?category=감동' },
    { name: '공포', link: '/board?category=공포' },
    { name: '일상', link: '/board?category=일상' },
    { name: '핫뉴스', link: '/board?category=핫뉴스' },
    { name: '💯 백베스트', link: '/board?best=3' }, 
    { name: '👑 천베스트', link: '/board?best=5' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <header className="bg-white p-4 border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-black text-[#3b4890] tracking-tighter">OJEMI</Link>
        </div>
      </header>

      {/* 상단 네비게이션 (클리앙 스타일로 깔끔하게) */}
      <nav className="bg-[#3b4890] text-gray-200 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap">
          {menus.map((menu) => {
            const isActive = (category !== 'all' && menu.name.includes(category)) || 
                             (bestType === 'today' && menu.name.includes('투데이')) ||
                             (category === 'all' && bestType === '' && menu.name === '전체글 보기');
            return (
              <Link href={menu.link} key={menu.name} 
                className={`px-4 py-3 text-sm font-bold transition-colors ${isActive ? 'bg-[#222b5c] text-white' : 'hover:bg-[#4a58a6] hover:text-white'}`}>
                {menu.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4 mb-20">
        
        <div className="flex justify-between items-end mb-4 border-b-2 border-gray-800 pb-2">
          <h2 className="text-2xl font-black text-gray-900">
            {bestType === 'today' ? '🔥 투데이 베스트 (추천 10 이상)' : 
             keyword ? `🔍 '${keyword}' 검색 결과 (${totalCount}건)` : 
             category !== 'all' ? `[${category}] 게시판` : '전체글 보기'}
          </h2>
          <Link href="/board/write" className="px-5 py-2 bg-[#3b4890] text-white rounded text-sm font-bold hover:bg-[#222b5c] transition-colors">
            ✍️ 글쓰기
          </Link>
        </div>

        {/* 게시판 리스트 영역 */}
        <div className="bg-white border-b border-gray-200 text-sm">
          {/* 리스트 헤더 */}
          <div className="hidden md:flex border-b border-gray-200 bg-gray-50 py-2.5 font-bold text-gray-600 text-center">
            <div className="w-16">번호</div>
            <div className="w-24">분류</div>
            <div className="flex-1">제목</div>
            <div className="w-32">글쓴이</div>
            <div className="w-24">날짜</div>
            <div className="w-16 text-blue-600">추천</div>
            <div className="w-16">조회</div>
          </div>

          {/* 💡 오늘의 장원 (상단 고정글) */}
          {topPost && (
            <Link href={`/board/${topPost.id}`} className="flex flex-col md:flex-row border-b border-gray-200 py-3 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer items-center">
              <div className="hidden md:block w-16 text-center text-xs text-gray-500">{topPost.id}</div>
              <div className="hidden md:block w-24 text-center font-bold text-[#3b4890]">[오늘의 장원]</div>
              <div className="flex-1 px-3 w-full font-bold text-gray-900 truncate">
                <span className="md:hidden text-[#3b4890] mr-1">[장원]</span>
                {topPost.title}
                {hasImage(topPost.content) && <span className="ml-1 text-xs" title="사진 포함">🖼️</span>}
              </div>
              <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-xs text-gray-500 justify-between items-center">
                <div className="md:w-32 md:text-center font-semibold text-gray-700 truncate">{topPost.author}</div>
                <div className="md:w-24 md:text-center text-gray-400">{formatDate(topPost.date)}</div>
                <div className="md:w-16 md:text-center font-bold text-blue-600">{topPost.likes || 0}</div>
                <div className="md:w-16 md:text-center text-gray-400">{topPost.views || 0}</div>
              </div>
            </Link>
          )}

          {/* 일반 게시글 리스트 */}
          {renderPosts.length === 0 && !topPost ? (
            <div className="text-center py-20 text-gray-400 font-medium">
              등록된 글이 없습니다.
            </div>
          ) : (
            renderPosts.map((post: any) => (
              <Link href={`/board/${post.id}`} key={post.id} className="flex flex-col md:flex-row border-b border-gray-100 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer items-center group">
                <div className="hidden md:block w-16 text-center text-xs text-gray-400">{post.id}</div>
                <div className="hidden md:block w-24 text-center text-xs font-semibold text-gray-500">[{post.category || '일상'}]</div>
                <div className="flex-1 px-3 w-full font-medium text-gray-800 group-hover:text-[#3b4890] truncate">
                  <span className="md:hidden text-gray-400 mr-1 text-xs">[{post.category || '일상'}]</span>
                  {post.title}
                  {hasImage(post.content) && <span className="ml-1 text-xs opacity-70" title="사진 포함">🖼️</span>}
                </div>
                <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-xs text-gray-400 justify-between items-center">
                  <div className="md:w-32 md:text-center font-medium text-gray-600 truncate">{post.author}</div>
                  <div className="md:w-24 md:text-center">{formatDate(post.date)}</div>
                  <div className={`md:w-16 md:text-center font-bold ${post.likes > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{post.likes || 0}</div>
                  <div className="md:w-16 md:text-center">{post.views || 0}</div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* 페이지 나누기 */}
        <div className="flex justify-center items-center gap-1 mt-6">
          {page > 1 && (
            <Link href={`/board?page=${page - 1}${keyword ? `&q=${keyword}` : ''}${bestType ? `&best=${bestType}` : ''}${category !== 'all' ? `&category=${category}` : ''}`} className="px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 font-bold text-xs">
              이전
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/board?page=${p}${keyword ? `&q=${keyword}` : ''}${bestType ? `&best=${bestType}` : ''}${category !== 'all' ? `&category=${category}` : ''}`} className={`px-3 py-1.5 border rounded font-bold text-xs transition-colors ${page === p ? 'bg-[#3b4890] text-white border-[#3b4890]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={`/board?page=${page + 1}${keyword ? `&q=${keyword}` : ''}${bestType ? `&best=${bestType}` : ''}${category !== 'all' ? `&category=${category}` : ''}`} className="px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 font-bold text-xs">
              다음
            </Link>
          )}
        </div>

        {/* 하단 검색창 */}
        <div className="mt-8 flex justify-center">
          <form action="/board" method="GET" className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            {bestType && <input type="hidden" name="best" value={bestType} />}
            {category !== 'all' && <input type="hidden" name="category" value={category} />}
            <select className="p-2 border border-gray-300 rounded focus:outline-[#3b4890] text-sm text-gray-600 font-bold bg-white outline-none cursor-pointer">
              <option value="all">제목 + 글쓴이</option>
            </select>
            <input name="q" defaultValue={keyword} placeholder="검색어를 입력하세요" className="p-2 border border-gray-300 rounded w-full md:w-64 focus:outline-[#3b4890] text-sm outline-none" required />
            <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-900 transition-colors text-sm w-full md:w-auto">
              검색
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}