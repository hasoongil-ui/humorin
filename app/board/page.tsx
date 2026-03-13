// @ts-nocheck
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
  const yy = String(kstDate.getFullYear()).slice(-2);
  return `${yy}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')}`;
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

function CategoryIcon({ category }: { category: string }) {
  const baseClass = "w-4 h-4 inline-block mr-2 flex-shrink-0";
  
  switch (category) {
    case '유머': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-orange-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm3.656 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Z" /></svg>;
    case '감동': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-rose-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>;
    case '자유게시판': 
    case '흥미로운 이야기': 
    case '세상사는 이야기': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-amber-600`}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>;
    case '귀여운 동물들': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-stone-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6-3-3h1.5a3 3 0 1 0 0-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
    case '유용한 상식': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-yellow-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.829 1.508-2.333a7.153 7.153 0 0 0 3.138-4.943c.035-.508.054-1.026.054-1.552 0-3.976-3.224-7.2-7.2-7.2s-7.2 3.224-7.2 7.2c0 .526.019 1.044.054 1.552a7.153 7.153 0 0 0 3.138 4.943c.85.504 1.508 1.35 1.508 2.333V18m1.5-5.25h.008v.008H12v-.008Z" /></svg>;
    case '맛집': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-red-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>;
    case '가볼만한 곳': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-emerald-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
    case '볼만한 영화': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-indigo-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 3v18m17.25-18v18M5.25 5.25h13.5m-13.5 13.5h13.5M7.5 5.25v13.5m9-13.5v13.5" /></svg>;
    case '게시판 신설 요청': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-rose-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;
    case '건강': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-pink-500`}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
    case '재테크': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-yellow-600`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case '수필/에세이':
    case '시/단상':
    case '소설/웹소설':
    case '창작/기타': return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-indigo-400`}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.12l-2.83.941a.75.75 0 01-.95-.95l.94-2.83a4.5 4.5 0 011.12-1.89l13.66-13.66z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" /></svg>;
    default: return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${baseClass} text-gray-400`}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;
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

  // 💡 [DB 연동 마법] 좌측 사이드바에 띄워줄 게시판 목록을 DB에서 직접 가져옵니다!
  let sidebarBoards = [];
  try {
    const { rows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    sidebarBoards = rows;
  } catch (e) {
    console.error("사이드바 게시판 불러오기 실패");
  }

  const categoryPattern = `%[${category}]%`;

  if (category !== 'all' && !keyword && bestType === '' && page === 1) {
    const { rows: topRows } = await sql`
      SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count 
      FROM posts 
      WHERE title LIKE ${categoryPattern} AND date >= NOW() - INTERVAL '48 hours' AND likes >= 3 AND COALESCE(status, 'published') = 'published'
      ORDER BY likes DESC, views DESC LIMIT 1
    `;
    if (topRows.length > 0) topPost = topRows[0];
  }

  if (bestType === 'today') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 10 AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 10 AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } 
  else if (bestType === '100') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 100 AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 100 AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } 
  else if (bestType === '1000') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 1000 AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 1000 AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } 
  else if (keyword && category !== 'all') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (keyword) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (category !== 'all') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
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
                    <div className="text-[11px] text-gray-400 font-bold mt-0.5">커뮤니티 오재미</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-1 mb-3">
                  <Link href="/profile" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">내정보</Link>
                  <Link href="#" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">쪽지<span className="text-red-500 ml-0.5">0</span></Link>
                  <Link href="/profile?tab=scraps" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">스크랩</Link>
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

          {/* 💡 [연동 완료!] 좌측 사이드바가 이제 관리자의 컨트롤 패널 지시를 받습니다! */}
          <div className="hidden md:block bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
            <div className="bg-[#414a66] text-white text-[13px] font-bold py-2.5 px-3 border-b border-[#2a3042]">
              운영 중인 게시판
            </div>
            <ul className="text-[13px] font-bold text-gray-600">
              <li><Link href="/board" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100">전체글 보기</Link></li>
              <li><Link href="/board?best=today" className="block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100">🔥 투데이 베스트</Link></li>
              {sidebarBoards.map(board => {
                const isActive = category === board.name;
                return (
                  <li key={board.id}>
                    <Link href={`/board?category=${board.name}`} className={`block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100 last:border-0 ${isActive ? 'bg-indigo-50 text-[#3b4890]' : ''}`}>
                      {board.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-white border border-gray-200 shadow-sm rounded-sm p-4 md:p-6">
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 truncate pr-2">
              {bestType === 'today' ? '🔥 투데이 베스트 (추천 10+)' : 
               bestType === '100' ? '💯 백베스트 (추천 100+)' : 
               bestType === '1000' ? '👑 천베스트 (추천 1000+)' : 
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
            <div className="hidden md:flex border-b border-gray-300 bg-gray-50 py-3 font-bold text-gray-600">
              <div className="w-12 text-center shrink-0">번호</div>
              <div className="flex-1 text-center">제목</div>
              <div className="w-24 text-center shrink-0">글쓴이</div>
              <div className="w-[70px] text-center shrink-0">날짜</div>
              <div className="w-12 text-center shrink-0">조회</div>
              <div className="w-12 text-center text-rose-500 shrink-0">공감</div>
            </div>

            {topPost && (() => {
              const topData = extractData(topPost.title);
              return (
                <div className="flex flex-col md:flex-row border-b border-gray-200 py-3 bg-blue-50/50 hover:bg-gray-50 transition-colors items-center group">
                  <div className="hidden md:block w-12 text-center text-xs text-gray-500 font-bold shrink-0">장원</div>
                  <Link href={`/board/${topPost.id}`} className="flex-1 min-w-0 px-3 md:px-4 w-full flex items-center cursor-pointer text-[15px] text-gray-800">
                    <CategoryIcon category={topData.cat} />
                    <span className="truncate group-hover:underline mr-1">{topData.cleanTitle}</span>
                    {hasImage(topPost.content) && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 ml-0.5 text-gray-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                    )}
                    {topPost.comment_count > 0 && (
                      <span className="ml-1 text-[13px] font-bold text-[#e74c3c] shrink-0">[{topPost.comment_count}]</span>
                    )}
                  </Link>
                  <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-[13px] text-gray-500 justify-between items-center shrink-0">
                    <div className="md:w-24 text-left md:text-center font-semibold text-gray-700 truncate">
                      {topPost.author_id ? (
                        <Link href={`/user/${topPost.author_id}`} className="hover:text-[#3b4890] hover:underline cursor-pointer">
                          {topPost.author}
                        </Link>
                      ) : (
                        <span>{topPost.author}</span>
                      )}
                    </div>
                    <div className="md:w-[70px] md:text-center text-gray-400">{formatDate(topPost.date)}</div>
                    <div className="md:w-12 md:text-center text-gray-400">{topPost.views || 0}</div>
                    <div className="md:w-12 md:text-center font-bold text-rose-500">{topPost.likes || 0}</div>
                  </div>
                </div>
              );
            })()}

            {renderPosts.length === 0 && !topPost ? (
              <div className="text-center py-20 text-gray-400 font-medium">등록된 게시물이 없습니다.</div>
            ) : (
              renderPosts.map((post: any) => {
                const postData = extractData(post.title);
                return (
                  <div key={post.id} className="flex flex-col md:flex-row border-b border-gray-200 py-2.5 hover:bg-gray-50 transition-colors items-center group">
                    <div className="hidden md:block w-12 text-center text-[13px] text-gray-400 shrink-0">{post.id}</div>
                    <Link href={`/board/${post.id}`} className="flex-1 min-w-0 px-3 md:px-4 w-full flex items-center cursor-pointer text-[15px] text-gray-800">
                      <CategoryIcon category={postData.cat} />
                      <span className="truncate group-hover:underline mr-1">{postData.cleanTitle}</span>
                      {hasImage(post.content) && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 ml-0.5 text-gray-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                      )}
                      {post.comment_count > 0 && (
                        <span className="ml-1 text-[13px] font-bold text-[#e74c3c] shrink-0">[{post.comment_count}]</span>
                      )}
                    </Link>
                    <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-[13px] text-gray-500 justify-between items-center shrink-0">
                      <div className="md:w-24 text-left md:text-center font-medium text-gray-600 truncate">
                        {post.author_id ? (
                          <Link href={`/user/${post.author_id}`} className="hover:text-[#3b4890] hover:underline cursor-pointer">
                            {post.author}
                          </Link>
                        ) : (
                          <span>{post.author}</span>
                        )}
                      </div>
                      <div className="md:w-[70px] md:text-center">{formatDate(post.date)}</div>
                      <div className="md:w-12 md:text-center">{post.views || 0}</div>
                      <div className={`md:w-12 md:text-center font-bold ${post.likes > 0 ? 'text-rose-500' : 'text-gray-300'}`}>
                        {post.likes || 0}
                      </div>
                    </div>
                  </div>
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