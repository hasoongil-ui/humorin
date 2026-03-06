import { sql } from '@vercel/postgres';
import Link from 'next/link';
import { cookies } from 'next/headers';

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
  
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  const handleLogout = async () => {
    'use server';
    const store = await cookies();
    store.delete('ojemi_user');
  };
  
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

  if (bestType === 'today') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 10 AND likes < 100`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= 10 AND likes < 100 ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (bestType === '100') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 100 AND likes < 1000`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= 100 AND likes < 1000 ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (bestType === '1000') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 1000`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= 1000 ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
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

  const canWrite = bestType === ''; 

  return (
    <>
      {/* 💡 상단 헤더와 메뉴바는 layout.tsx로 이사갔습니다! 여기는 본문만 렌더링합니다. */}
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-5 p-4 md:py-6 mt-2 mb-20">
        
        <aside className="w-full md:w-[240px] shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4">
            {currentUser ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-xl shadow-inner">
                    👤
                  </div>
                  <div>
                    <div className="font-black text-gray-800 text-sm">
                      <span className="text-[#3b4890]">{currentUser}</span>님
                    </div>
                    <div className="text-[11px] text-gray-400 font-bold mt-0.5">최고의 커뮤니티 오재미!</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-1 mb-3">
                  <Link href="#" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">내정보</Link>
                  <Link href="#" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">쪽지<span className="text-red-500 ml-0.5">0</span></Link>
                  <Link href="#" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">스크랩</Link>
                </div>

                <form action={handleLogout}>
                  <button type="submit" className="w-full py-2 bg-gray-800 text-white text-xs font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm">
                    로그아웃
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold text-gray-500 mb-3 text-center">
                  오재미를 더 편리하게 이용하세요!
                </div>
                <Link href="/login" className="block w-full text-center py-2 bg-[#414a66] text-white rounded-sm text-sm font-bold hover:bg-[#2a3042] transition-colors shadow-sm mb-2">
                  로그인
                </Link>
                <div className="flex justify-between text-xs font-bold text-gray-500 px-1">
                  <Link href="/signup" className="hover:text-gray-900">회원가입</Link>
                  <Link href="#" className="hover:text-gray-900">아이디/비번 찾기</Link>
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
            <div className="bg-[#414a66] text-white text-[13px] font-bold py-2.5 px-3 border-b border-[#2a3042]">
              즐겨찾는 게시판
            </div>
            <ul className="text-[13px] font-bold text-gray-600">
              <li><Link href="/board" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100">전체글 보기</Link></li>
              <li><Link href="/board?best=today" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100">🔥 투데이 베스트</Link></li>
              <li><Link href="/board?category=유머" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100">유머 게시판</Link></li>
              <li><Link href="/board?category=일상" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890]">일상 게시판</Link></li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-white border border-gray-200 shadow-sm rounded-sm p-4 md:p-6">
          
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {bestType === 'today' ? '🔥 투데이 베스트 (추천 10~99)' : 
               bestType === '100' ? '💯 백베스트 (추천 100~999)' : 
               bestType === '1000' ? '👑 천베스트 (추천 1000+)' : 
               keyword ? `🔍 '${keyword}' 검색 결과 (${totalCount}건)` : 
               category !== 'all' ? `${category}` : '전체글 보기'}
            </h2>
          </div>

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

          <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
            <div className="hidden md:block w-24"></div> 
            
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
                <Link href={`/board/write?category=${category}`} className="w-full md:w-auto px-5 py-2 bg-[#414a66] text-white rounded-sm text-sm font-bold hover:bg-[#2a3042] transition-colors flex items-center justify-center">
                  글쓰기
                </Link>
              )}
            </div>
          </div>

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
    </>
  );
}