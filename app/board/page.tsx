import { sql } from '@vercel/postgres';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(dateString: any) {
  const dbDate = new Date(dateString);
  const kstDate = new Date(dbDate.getTime() + 9 * 60 * 60 * 1000);
  const nowUtc = new Date();
  const nowKst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  
  const isToday = kstDate.getDate() === nowKst.getDate() && kstDate.getMonth() === nowKst.getMonth() && kstDate.getFullYear() === nowKst.getFullYear();
  
  if (isToday) {
    return `${String(kstDate.getHours()).padStart(2, '0')}:${String(kstDate.getMinutes()).padStart(2, '0')}`;
  }
  return `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')}`;
}

function hasImage(content: string) {
  if (!content) return false;
  return /<img[^>]+src="([^">]+)"/.test(content);
}

// 💡 초경량 꼬리표 정리기: 화면에 띄울 때만 [유머] [유머]를 0.0001초 만에 하나로 합쳐줍니다. (성능 저하 0%)
function extractData(fullTitle: string) {
  if (!fullTitle) return { cat: '일반', cleanTitle: '' };
  const match = fullTitle.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    const cat = match[1];
    let cleanTitle = match[2].trim();
    while (cleanTitle.startsWith(`[${cat}]`)) {
      cleanTitle = cleanTitle.substring(cat.length + 2).trim();
    }
    return { cat, cleanTitle };
  }
  return { cat: '일반', cleanTitle: fullTitle };
}

export default async function BoardPage(props: any) {
  const searchParams = await props.searchParams;
  const bestType = searchParams.best || ''; 
  const category = searchParams.category || 'all';
  const keyword = searchParams.q || ''; 
  const page = searchParams.page ? Number(searchParams.page) : 1;
  
  const limit = 20; 
  const offset = (page - 1) * limit; 

  let posts = [];
  let totalCount = 0; 
  let topPost = null;

  const categoryPattern = `%[${category}]%`;

  if (category !== 'all' && !keyword && bestType === '' && page === 1) {
    const { rows: topRows } = await sql`
      SELECT * FROM posts 
      WHERE title LIKE ${categoryPattern} AND date >= NOW() - INTERVAL '1 day' AND likes > 0 
      ORDER BY likes DESC, views DESC LIMIT 1
    `;
    if (topRows.length > 0) topPost = topRows[0];
  }

  // 게시글 불러오기 로직 (이전과 동일)
  if (bestType === 'today') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE date >= NOW() - INTERVAL '1 day' AND likes >= 10`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE date >= NOW() - INTERVAL '1 day' AND likes >= 10 ORDER BY likes DESC, views DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (bestType === '3' || bestType === '5') {
    const bestNum = Number(bestType);
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= ${bestNum}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestNum} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (keyword && category !== 'all') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'})`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE title LIKE ${categoryPattern} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (keyword) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (category !== 'all') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE title LIKE ${categoryPattern} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) FROM posts`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const renderPosts = topPost ? posts.filter((p: any) => p.id !== topPost.id) : posts;

  // 베스트 게시판이 아니면(일반 게시판이거나 전체글 보기면) 글쓰기 허용!
  const canWrite = bestType === ''; 

  const menus = [
    { name: '🔥 투데이 베스트', link: '/board?best=today' },
    { name: '전체글 보기', link: '/board' },
    { name: '유머', link: '/board?category=유머' },
    { name: '감동', link: '/board?category=감동' },
    { name: '공포', link: '/board?category=공포' },
    { name: '일상', link: '/board?category=일상' },
    { name: '그냥 혼잣말', link: '/board?category=그냥 혼잣말' },
    { name: '핫뉴스', link: '/board?category=핫뉴스' },
    { name: '💯 백베스트', link: '/board?best=3' }, 
    { name: '👑 천베스트', link: '/board?best=5' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-white p-4 border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-black text-[#3b4890] tracking-tighter">OJEMI</Link>
        </div>
      </header>

      <nav className="bg-[#414a66] text-gray-200 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap">
          {menus.map((menu) => {
            const isActive = (category !== 'all' && menu.name.includes(category)) || 
                             (bestType === 'today' && menu.name.includes('투데이')) ||
                             (category === 'all' && bestType === '' && menu.name === '전체글 보기');
            return (
              <Link href={menu.link} key={menu.name} 
                className={`px-4 py-3 text-sm font-bold transition-colors ${isActive ? 'bg-[#2a3042] text-white' : 'hover:bg-[#5b6586] hover:text-white'}`}>
                {menu.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-6 mb-20 bg-white border border-gray-200 shadow-sm rounded-sm">
        
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {bestType === 'today' ? '🔥 투데이 베스트 (추천 10 이상)' : 
             keyword ? `🔍 '${keyword}' 검색 결과 (${totalCount}건)` : 
             category !== 'all' ? `${category}` : '전체글 보기'}
          </h2>
        </div>

        {/* 클리앙 스타일: 위아래가 굵은 선으로 마감된 깔끔한 테이블 디자인 */}
        <div className="border-t-2 border-gray-700 text-sm">
          <div className="hidden md:flex border-b border-gray-300 bg-gray-50 py-3 font-bold text-gray-600 text-center">
            <div className="w-16">번호</div>
            <div className="flex-1">제목</div>
            <div className="w-32">글쓴이</div>
            <div className="w-24">등록일</div>
            <div className="w-16 text-blue-600">추천</div>
            <div className="w-16">조회</div>
          </div>

          {topPost && (() => {
            const topData = extractData(topPost.title);
            return (
              <Link href={`/board/${topPost.id}`} className="flex flex-col md:flex-row border-b border-gray-200 py-3 bg-blue-50/50 hover:bg-gray-50 transition-colors cursor-pointer items-center">
                <div className="hidden md:block w-16 text-center text-xs text-gray-500 font-bold">장원</div>
                <div className="flex-1 px-3 w-full font-bold text-gray-900 truncate text-left">
                  <span className="text-[#3b4890] mr-1">[{topData.cat}]</span>
                  {topData.cleanTitle}
                  {hasImage(topPost.content) && <span className="ml-1 text-xs opacity-70">🖼️</span>}
                </div>
                <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-xs text-gray-500 justify-between items-center">
                  <div className="md:w-32 md:text-center font-semibold text-gray-700 truncate">{topPost.author}</div>
                  <div className="md:w-24 md:text-center text-gray-400">{formatDate(topPost.date)}</div>
                  <div className="md:w-16 md:text-center font-bold text-blue-600">{topPost.likes || 0}</div>
                  <div className="md:w-16 md:text-center text-gray-400">{topPost.views || 0}</div>
                </div>
              </Link>
            );
          })()}

          {renderPosts.length === 0 && !topPost ? (
            <div className="text-center py-20 text-gray-400 font-medium">등록된 게시물이 없습니다.</div>
          ) : (
            renderPosts.map((post: any) => {
              const postData = extractData(post.title);
              return (
                <Link href={`/board/${post.id}`} key={post.id} className="flex flex-col md:flex-row border-b border-gray-200 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer items-center group">
                  <div className="hidden md:block w-16 text-center text-xs text-gray-400">{post.id}</div>
                  <div className="flex-1 px-3 w-full text-gray-800 group-hover:underline truncate text-left text-[15px]">
                    <span className="text-gray-500 mr-1.5 text-sm font-semibold">[{postData.cat}]</span>
                    {postData.cleanTitle}
                    {hasImage(post.content) && <span className="ml-1 text-xs opacity-60">🖼️</span>}
                  </div>
                  <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-xs text-gray-500 justify-between items-center">
                    <div className="md:w-32 md:text-center font-medium text-gray-600 truncate">{post.author}</div>
                    <div className="md:w-24 md:text-center">{formatDate(post.date)}</div>
                    <div className={`md:w-16 md:text-center font-bold ${post.likes > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{post.likes || 0}</div>
                    <div className="md:w-16 md:text-center">{post.views || 0}</div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* 💡 클리앙 스타일: 하단 페이지 번호(가운데)와 글쓰기 버튼(오른쪽)의 완벽한 배치 */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
          <div className="hidden md:block w-24"></div> {/* 균형을 맞추기 위한 빈 공간 */}
          
          <div className="flex justify-center items-center gap-1">
            {page > 1 && (
              <Link href={`/board?page=${page - 1}${keyword ? `&q=${keyword}` : ''}${bestType ? `&best=${bestType}` : ''}${category !== 'all' ? `&category=${category}` : ''}`} className="px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-xs">
                이전
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link key={p} href={`/board?page=${p}${keyword ? `&q=${keyword}` : ''}${bestType ? `&best=${bestType}` : ''}${category !== 'all' ? `&category=${category}` : ''}`} className={`px-3 py-1.5 border rounded-sm font-bold text-xs transition-colors ${page === p ? 'bg-[#414a66] text-white border-[#414a66]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link href={`/board?page=${page + 1}${keyword ? `&q=${keyword}` : ''}${bestType ? `&best=${bestType}` : ''}${category !== 'all' ? `&category=${category}` : ''}`} className="px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-xs">
                다음
              </Link>
            )}
          </div>

          <div className="w-full md:w-24 flex justify-end">
            {canWrite && (
              <Link href={`/board/write?category=${category}`} className="w-full md:w-auto px-5 py-2 bg-[#414a66] text-white rounded-sm text-sm font-bold hover:bg-[#2a3042] transition-colors flex items-center justify-center gap-1">
                ✏️ 글쓰기
              </Link>
            )}
          </div>
        </div>

        {/* 하단 검색창 (클리앙 스타일로 조금 더 단정하게) */}
        <div className="mt-8 flex justify-center pt-6 border-t border-gray-100">
          <form action="/board" method="GET" className="flex gap-1 w-full md:w-auto">
            {bestType && <input type="hidden" name="best" value={bestType} />}
            {category !== 'all' && <input type="hidden" name="category" value={category} />}
            <select className="p-2 border border-gray-300 rounded-sm focus:border-gray-500 text-sm text-gray-600 font-bold bg-white outline-none cursor-pointer">
              <option value="all">제목 + 내용</option>
            </select>
            <input name="q" defaultValue={keyword} placeholder="검색어를 입력하세요" className="p-2 border border-gray-300 rounded-sm w-full md:w-64 focus:border-gray-500 text-sm outline-none" required />
            <button type="submit" className="px-5 py-2 bg-gray-600 text-white rounded-sm font-bold hover:bg-gray-700 transition-colors text-sm">
              검색
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}