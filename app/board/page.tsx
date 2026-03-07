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

// 💡 미나의 핵심: 각 카테고리별 세련된 선형 SVG 아이콘 매핑 함수
function CategoryIcon({ category }: { category: string }) {
  const baseClass = "w-4 h-4 inline-block mr-2 flex-shrink-0";
  
  switch (category) {
    case '유머': // 웃는 얼굴 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-orange-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm3.656 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Z" /></svg>;
    case '감동': // 하트 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-rose-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>;
    case '부동산 사랑방': // 집/건물 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-blue-600`}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" /></svg>;
    case '세상사는 이야기': // 커피잔 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-amber-700`}><path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l1.5 1.5.75-.75V8.25l-.75-.75h-3l-1.5 1.5M9 11.25l-1.5 1.5-.75-.75V8.25l.75-.75h3l1.5 1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 14.25h15m-15 0a3 3 0 003 3h9a3 3 0 003-3m-15 0V8.25m15 6V8.25m-15 0h15" /></svg>;
    case '이거 알려주세요': // 물음표 말풍선 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-indigo-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>;
    case '유용한 상식': // 전구(상식) 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-yellow-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.829 1.508-2.333a7.153 7.153 0 0 0 3.138-4.943c.035-.508.054-1.026.054-1.552 0-3.976-3.224-7.2-7.2-7.2s-7.2 3.224-7.2 7.2c0 .526.019 1.044.054 1.552a7.153 7.153 0 0 0 3.138 4.943c.85.504 1.508 1.35 1.508 2.333V18m1.5-5.25h.008v.008H12v-.008Z" /></svg>;
    case '귀여운 동물들': // 발바닥 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-stone-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6-3-3h1.5a3 3 0 1 0 0-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
    case '인사 한마디': // 손인사 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-teal-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" /></svg>;
    default: // 일반 문서 아이콘
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-gray-400`}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;
  }
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

  // 💡 미나의 철저한 복구: 서브쿼리를 이용해 각 게시글의 '댓글 수'를 강제로 집계하여 가져옵니다.
  const commentCountQuery = sql`
    SELECT posts.*, 
    (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count 
    FROM posts
  `;

  if (category !== 'all' && !keyword && bestType === '' && page === 1) {
    const { rows: topRows } = await sql`
      SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count 
      FROM posts 
      WHERE title LIKE ${categoryPattern} AND date >= NOW() - INTERVAL '1 day' AND likes > 0 
      ORDER BY likes DESC, views DESC LIMIT 1
    `;
    if (topRows.length > 0) topPost = topRows[0];
  }

  if (bestType === 'today') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 10 AND likes < 100`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 10 AND likes < 100 ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (bestType === '100') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 100 AND likes < 1000`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 100 AND likes < 1000 ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (bestType === '1000') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 1000`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 1000 ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (keyword && category !== 'all') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'})`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (keyword) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (category !== 'all') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) FROM posts`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const renderPosts = topPost ? posts.filter((p: any) => p.id !== topPost.id) : posts;

  const canWrite = bestType === ''; 

  return (
    <>
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-5 p-4 md:py-6 mt-2 mb-20">
        
        <aside className="w-full md:w-[240px] shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4">
            {currentUser ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-gray-500 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  </div>
                  <div>
                    <div className="font-black text-gray-800 text-sm">
                      <span className="text-[#3b4890]">{currentUser}</span>님
                    </div>
                    <div className="text-[11px] text-gray-400 font-bold mt-0.5">명품 커뮤니티 오재미</div>
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
                  오재미를 더 편리하게 이용하세요.
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
              <li><Link href="/board?best=today" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100">투데이 베스트</Link></li>
              <li><Link href="/board?category=유머" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100">유머 게시판</Link></li>
              <li><Link href="/board?category=일상" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890]">일상 게시판</Link></li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-white border border-gray-200 shadow-sm rounded-sm p-4 md:p-6">
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 truncate pr-2">
              {bestType === 'today' ? '투데이 베스트 (추천 10~99)' : 
               bestType === '100' ? '백베스트 (추천 100~999)' : 
               bestType === '1000' ? '천베스트 (추천 1000+)' : 
               keyword ? `'${keyword}' 검색 결과 (${totalCount}건)` : 
               category !== 'all' ? `${category}` : '전체글 보기'}
            </h2>
            
            {canWrite && (
              <Link href={`/board/write?category=${category}`} className="shrink-0 px-4 py-2 bg-[#3b4890] text-white rounded-sm text-sm font-bold hover:bg-[#2a3042] transition-colors shadow-sm flex items-center gap-1">
                글쓰기
              </Link>
            )}
          </div>

          <div className="border-t-2 border-gray-700 text-sm">
            <div className="hidden md:flex border-b border-gray-300 bg-gray-50 py-3 font-bold text-gray-600 text-center">
              <div className="w-16">번호</div>
              <div className="flex-1">제목</div>
              <div className="w-32">글쓴이</div>
              <div className="w-24">등록일</div>
              <div className="w-16">조회</div>
              <div className="w-16 text-rose-500">공감</div>
            </div>

            {topPost && (() => {
              const topData = extractData(topPost.title);
              return (
                <Link href={`/board/${topPost.id}`} className="flex flex-col md:flex-row border-b border-gray-200 py-3 bg-blue-50/50 hover:bg-gray-50 transition-colors cursor-pointer items-center">
                  <div className="hidden md:block w-16 text-center text-xs text-gray-500 font-bold">장원</div>
                  <div className="flex-1 px-3 w-full font-bold text-gray-900 truncate text-left flex items-center">
                    {/* 💡 카테고리 텍스트 대신 세련된 SVG 아이콘 출력! */}
                    <CategoryIcon category={topData.cat} />
                    <span className="truncate">{topData.cleanTitle}</span>
                    {hasImage(topPost.content) && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 ml-1 text-gray-400 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                    )}
                    {/* 💡 복구된 댓글 수 표시 */}
                    {topPost.comment_count > 0 && (
                      <span className="ml-1.5 text-[13px] font-bold text-[#e74c3c]">[{topPost.comment_count}]</span>
                    )}
                  </div>
                  <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-xs text-gray-500 justify-between items-center">
                    <div className="md:w-32 md:text-center font-semibold text-gray-700 truncate">{topPost.author}</div>
                    <div className="md:w-24 md:text-center text-gray-400">{formatDate(topPost.date)}</div>
                    <div className="md:w-16 md:text-center text-gray-400">{topPost.views || 0}</div>
                    <div className="md:w-16 md:text-center font-bold text-rose-500">{topPost.likes || 0}</div>
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
                    <div className="flex-1 px-3 w-full text-gray-800 group-hover:underline truncate text-left text-[15px] flex items-center">
                      {/* 💡 카테고리 텍스트 대신 세련된 SVG 아이콘 출력! */}
                      <CategoryIcon category={postData.cat} />
                      <span className="truncate">{postData.cleanTitle}</span>
                      {hasImage(post.content) && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 ml-1 text-gray-400 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                      )}
                      {/* 💡 복구된 댓글 수 표시 */}
                      {post.comment_count > 0 && (
                        <span className="ml-1.5 text-[13px] font-bold text-[#e74c3c]">[{post.comment_count}]</span>
                      )}
                    </div>
                    <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-xs text-gray-500 justify-between items-center">
                      <div className="md:w-32 md:text-center font-medium text-gray-600 truncate">{post.author}</div>
                      <div className="md:w-24 md:text-center">{formatDate(post.date)}</div>
                      <div className="md:w-16 md:text-center">{post.views || 0}</div>
                      <div className={`md:w-16 md:text-center font-bold ${post.likes > 0 ? 'text-rose-500' : 'text-gray-300'}`}>
                        {post.likes || 0}
                      </div>
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

        </main>
      </div>
    </>
  );
}