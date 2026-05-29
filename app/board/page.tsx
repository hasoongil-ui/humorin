// 파일 위치: app/board/page.tsx
// @ts-nocheck
import { sql } from '@vercel/postgres';
import Link from 'next/link';
import { cookies } from 'next/headers';
import CategoryIcon from './CategoryIcon';
import HybridPrefetchTrigger from './HybridPrefetchTrigger';

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

function extractFirstImage(content: string) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
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
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const keyword = searchParams.q || '';
  const searchType = searchParams.searchType || 'title';
  
  const queryParams = new URLSearchParams();
  if (page > 1) queryParams.set('page', page.toString());
  if (category !== 'all') queryParams.set('category', category);
  if (bestType) queryParams.set('best', bestType);
  if (keyword) {
    queryParams.set('q', keyword);
    queryParams.set('searchType', searchType);
  }
  const queryString = queryParams.toString();
  const fromQuery = queryString ? `?${queryString}` : '';

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('humorin_user');
  const userIdCookie = cookieStore.get('humorin_userid');

  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  let currentUserProfileImage = null;
  if (currentUserId) {
    try {
      const { rows } = await sql`SELECT profile_image FROM users WHERE user_id = ${currentUserId}`;
      if (rows.length > 0) {
        currentUserProfileImage = rows[0].profile_image;
      }
    } catch (e) {
      console.error("사이드바 프로필 이미지 가져오기 실패");
    }
  }

  const handleLogout = async () => {
    'use server';
    const store = await cookies();
    store.delete('humorin_user');
    store.delete('humorin_userid');
    store.delete('humorin_signature');
  };

  const limit = 20;
  const offset = (page - 1) * limit;

  let posts = [];
  let noticePosts: any[] = [];
  let totalCount = 0;
  let topPost = null;

  let sidebarBoards = [];
  try {
    const { rows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    sidebarBoards = rows;
  } catch (e) {}

  // 💡 [핵심 방어막] PC 사이드바 무한 증식 방지를 위한 게시판 분리 작업!
  const normalBoards = sidebarBoards.filter(b => !(b.group_name && b.group_name.includes('포럼')));
  const forumBoards = sidebarBoards.filter(b => b.group_name && b.group_name.includes('포럼'));

  const categoryPattern = category !== 'all' ? `%[${category}]%` : '%';
  const isAll = category === 'all';

  let showcaseData = null;
  if (bestType === 'showcase' && page === 1 && !keyword) {
    try {
      const [weeklyRes, monthlyRes, allTimeRes] = await Promise.all([
        sql`SELECT id, title, author, likes, views, content, date FROM posts WHERE date >= NOW() - INTERVAL '7 days' AND COALESCE(status, 'published') = 'published' AND is_blinded = false ORDER BY likes DESC, views DESC LIMIT 1`,
        sql`SELECT id, title, author, likes, views, content, date FROM posts WHERE date >= NOW() - INTERVAL '30 days' AND COALESCE(status, 'published') = 'published' AND is_blinded = false ORDER BY likes DESC, views DESC LIMIT 1`,
        sql`SELECT id, title, author, likes, views, content, date FROM posts WHERE COALESCE(status, 'published') = 'published' AND is_blinded = false ORDER BY likes DESC, views DESC LIMIT 1`
      ]);
      showcaseData = {
        weekly: weeklyRes.rows[0] || null,
        monthly: monthlyRes.rows[0] || null,
        allTime: allTimeRes.rows[0] || null
      };
    } catch (e) {
      console.error("쇼케이스 로딩 에러:", e);
    }
  }

  if (page === 1 && !keyword && bestType === '') {
    try {
      const { rows } = await sql`
        SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count 
        FROM posts 
        WHERE (is_notice = true OR (${isAll}::boolean = false AND is_board_notice = true AND title LIKE ${categoryPattern}))
          AND COALESCE(status, 'published') = 'published'
        ORDER BY is_notice DESC, is_board_notice DESC, date DESC
      `;
      noticePosts = rows;
    } catch (e) {}
  }

  if (category !== 'all' && !keyword && bestType === '' && page === 1) {
    const { rows: topRows } = await sql`
      SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count 
      FROM posts 
      WHERE title LIKE ${categoryPattern} 
        AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%')
        AND date >= NOW() - INTERVAL '48 hours' AND likes >= 3 AND COALESCE(status, 'published') = 'published'
      ORDER BY likes DESC, views DESC LIMIT 1
    `;
    if (topRows.length > 0) topPost = topRows[0];
  }

  if (keyword) {
    const searchPattern = `%${keyword}%`;
    let countRes, rowsRes;
    if (searchType === 'title') {
      countRes = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND title ILIKE ${searchPattern} AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%') AND COALESCE(status, 'published') = 'published'`;
      rowsRes = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND title ILIKE ${searchPattern} AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%') AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (searchType === 'content') {
      countRes = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND content ILIKE ${searchPattern} AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%') AND COALESCE(status, 'published') = 'published'`;
      rowsRes = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND content ILIKE ${searchPattern} AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%') AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      countRes = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND author ILIKE ${searchPattern} AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%') AND COALESCE(status, 'published') = 'published'`;
      rowsRes = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND author ILIKE ${searchPattern} AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%') AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    }
    totalCount = Number(countRes.rows[0].count);
    posts = rowsRes.rows;
  }
  else if (bestType === 'today') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 10 AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 10 AND COALESCE(status, 'published') = 'published' ORDER BY best_at DESC NULLS LAST, date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }
  else if (bestType === '100' || bestType === 'showcase') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 100 AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 100 AND COALESCE(status, 'published') = 'published' ORDER BY best100_at DESC NULLS LAST, date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }
  else if (bestType === '1000') {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= 1000 AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 1000 AND COALESCE(status, 'published') = 'published' ORDER BY best1000_at DESC NULLS LAST, date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }
  else {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%') AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND (${isAll}::boolean = false OR title NOT LIKE '[익명 다락방]%') AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const noticeIds = new Set(noticePosts.map(p => p.id));
  const renderPosts = posts.filter((p: any) => !noticeIds.has(p.id) && (!topPost || p.id !== topPost.id));
  const renderTopPost = topPost && !noticeIds.has(topPost.id) ? topPost : null;
  const canWrite = bestType === '';

  const getPageUrl = (pageNum: number) => {
    const qParams = new URLSearchParams(queryString);
    if (pageNum > 1) qParams.set('page', pageNum.toString());
    else qParams.delete('page');
    const qStr = qParams.toString();
    return `/board${qStr ? `?${qStr}` : ''}`;
  };

  const blockSize = 5;
  const currentBlock = Math.ceil(page / blockSize);
  const startPage = (currentBlock - 1) * blockSize + 1;
  const endPage = Math.min(startPage + blockSize - 1, totalPages);

  const visiblePages = [];
  for (let i = startPage; i <= endPage; i++) visiblePages.push(i);

  const titleClasses = "group-hover:underline mr-1 line-clamp-2 md:line-clamp-none md:truncate break-all md:break-normal whitespace-normal md:whitespace-nowrap leading-snug";

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .forum-scrollbar::-webkit-scrollbar { width: 5px; }
        .forum-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .forum-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .forum-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-5 p-4 md:py-6 mt-2 mb-20">

        <aside className="w-full md:w-[240px] shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4">
            {currentUser ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-gray-500 shadow-inner overflow-hidden shrink-0">
                    {currentUserProfileImage ? (
                      <img src={currentUserProfileImage} alt={`${currentUser}님의 프로필`} className="w-full h-full object-cover" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-gray-800 text-sm truncate">
                      <span className="text-[#3b4890]">{currentUser}</span>님
                    </div>
                    <div className="text-[11px] text-gray-400 font-bold mt-0.5 truncate">커뮤니티 유머인</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 mb-3">
                  <Link href="/profile" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">내정보</Link>
                  <Link href="#" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">쪽지<span className="text-red-500 ml-0.5">0</span></Link>
                  <Link href="/profile?tab=scraps" className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center text-xs font-bold text-gray-600 rounded-sm">스크랩</Link>
                </div>

                <form action={handleLogout}>
                  <button type="submit" className="w-full py-2 bg-gray-800 text-white text-xs font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap">
                    로그아웃
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold text-gray-500 mb-3 text-center">
                  유머인를 더 편리하게 이용하세요.
                </div>
                <Link href="/login" className="block w-full text-center py-2 bg-[#414a66] text-white rounded-sm text-sm font-bold hover:bg-[#2a3042] transition-colors shadow-sm mb-2 whitespace-nowrap">
                  로그인
                </Link>
                <div className="flex justify-between text-xs font-bold text-gray-500 px-1">
                  <Link href="/signup" className="hover:text-gray-900">회원가입</Link>
                  <Link href="/find-account" className="hover:text-gray-900">아이디/비번 찾기</Link>
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
            <div className="bg-[#414a66] text-white text-[13px] font-bold py-2.5 px-3 border-b border-[#2a3042]">
              운영 중인 게시판
            </div>
            <ul className="text-[13px] font-bold text-gray-600 pb-2">
              <li><Link href="/board" className={`block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100 ${category === 'all' && bestType === '' ? 'bg-indigo-50 text-[#3b4890]' : ''}`}>전체글 보기</Link></li>
              <li><Link href="/board?best=today" className={`block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100 ${bestType === 'today' ? 'bg-indigo-50 text-[#3b4890]' : ''}`}>🔥 투데이 베스트</Link></li>
              
              <li><Link href="/board?best=showcase" className={`block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100 ${bestType === 'showcase' ? 'bg-indigo-50 text-[#3b4890]' : ''}`}>🏛️ 명작 쇼케이스</Link></li>
              <li><Link href="/board?best=100" className={`block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100 ${bestType === '100' ? 'bg-indigo-50 text-[#3b4890]' : ''}`}>💯 백베스트</Link></li>
              <li><Link href="/board?best=1000" className={`block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100 ${bestType === '1000' ? 'bg-indigo-50 text-[#3b4890]' : ''}`}>👑 천베스트</Link></li>

              {/* 일반 게시판 노출 */}
              {normalBoards.map(board => {
                const isActive = category === board.name && bestType === '';
                return (
                  <li key={board.id}>
                    <Link href={`/board?category=${board.name}`} className={`block px-4 py-2.5 hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100 ${isActive ? 'bg-indigo-50 text-[#3b4890]' : ''}`}>
                      {board.name}
                    </Link>
                  </li>
                );
              })}

              {/* 💡 [핵심 방어막] 포럼 전용 내부 스크롤 구역 생성 */}
              {forumBoards.length > 0 && (
                <li className="mt-3 px-2">
                  <div className="bg-[#f4f5f7] border border-gray-200 rounded-sm overflow-hidden">
                    <div className="px-3 py-2 bg-gray-100 text-[#414a66] text-[11px] font-black border-b border-gray-200 flex items-center gap-1.5 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>
                      포럼 (스크롤하여 확인)
                    </div>
                    <ul className="max-h-[220px] overflow-y-auto forum-scrollbar bg-white">
                      {forumBoards.map(board => {
                        const isActive = category === board.name && bestType === '';
                        return (
                          <li key={board.id}>
                            <Link href={`/board?category=${board.name}`} className={`block px-3 py-2 text-[12px] hover:bg-gray-50 hover:text-[#3b4890] border-b border-gray-100 last:border-0 ${isActive ? 'bg-indigo-50 text-[#3b4890] font-black' : 'font-semibold'}`}>
                              {board.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-white border border-gray-200 shadow-sm rounded-sm p-4 md:p-6">

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 truncate pr-2">
              {keyword ? `'${keyword}' 검색 결과 (${totalCount}건)` :
                bestType === 'today' ? '🔥 투데이 베스트 (추천 10+)' :
                  bestType === 'showcase' ? '🏛️ 명작 쇼케이스' :
                  bestType === '100' ? '💯 백베스트 (추천 100+)' :
                    bestType === '1000' ? '👑 천베스트 (추천 1000+)' :
                      category !== 'all' ? `${category}` : '전체글 보기'}
            </h2>

            {canWrite && (
              <Link href={`/board/write?category=${category}`} className="shrink-0 px-4 py-2 bg-[#3b4890] text-white rounded-sm text-sm font-bold hover:bg-[#2a3042] transition-colors shadow-sm flex items-center gap-1 whitespace-nowrap">
                글쓰기
              </Link>
            )}
          </div>

          {showcaseData && (
            <div className="mb-10">
              <div className="mb-5 flex flex-col border-b-2 border-gray-800 pb-3">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <span className="text-yellow-500 text-2xl">🏛️</span> 
                  유머인 <span className="text-[#3b4890]">레전드 TOP 3</span>
                </h2>
                <p className="text-gray-500 text-sm font-bold mt-1.5 ml-1">
                  수많은 유머인들을 웃고 울린 전설의 레전드 게시글 TOP 3
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                
                {showcaseData.weekly && (() => {
                  const data = extractData(showcaseData.weekly.title);
                  const img = extractFirstImage(showcaseData.weekly.content);
                  const author = showcaseData.weekly.title.startsWith('[익명 다락방]') ? '익명' : showcaseData.weekly.author;
                  return (
                    <Link href={`/board/${showcaseData.weekly.id}${fromQuery}`} className="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-[#3b4890]/30 transition-all duration-300 relative overflow-hidden flex flex-col">
                      <div className="absolute top-3 left-3 z-10">
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black px-3 py-1.5 rounded-md shadow-md border border-white/20 flex items-center gap-1">
                          <span className="text-sm">🥇</span> 이번 주 1위
                        </div>
                      </div>
                      <div className="w-full h-[160px] bg-gray-50 overflow-hidden relative border-b border-gray-100 flex items-center justify-center">
                        {img ? (
                          <img src={img} alt="썸네일" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <span className="text-gray-300 text-4xl font-black">No Image</span>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-[15px] font-black text-gray-900 group-hover:text-[#3b4890] line-clamp-2 break-all leading-snug mb-3">
                          {data.cleanTitle}
                        </h3>
                        <div className="mt-auto flex justify-between items-center text-[11px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-sm">{data.cat}</span>
                            <span className="text-gray-400 truncate max-w-[80px]">{author}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                          <span className="text-gray-400 text-[11px] font-medium flex items-center gap-1">
                            조회 {showcaseData.weekly.views || 0}
                          </span>
                          <span className="text-rose-500 font-black text-[13px] flex items-center gap-1">
                            ♥ {showcaseData.weekly.likes || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })()}

                {showcaseData.monthly && (() => {
                  const data = extractData(showcaseData.monthly.title);
                  const img = extractFirstImage(showcaseData.monthly.content);
                  const author = showcaseData.monthly.title.startsWith('[익명 다락방]') ? '익명' : showcaseData.monthly.author;
                  return (
                    <Link href={`/board/${showcaseData.monthly.id}${fromQuery}`} className="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-[#3b4890]/30 transition-all duration-300 relative overflow-hidden flex flex-col md:-translate-y-1.5">
                      <div className="absolute top-3 left-3 z-10">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[12px] font-black px-3 py-1.5 rounded-md shadow-md border border-white/20 flex items-center gap-1">
                          <span className="text-sm">🏆</span> 이번 달 1위
                        </div>
                      </div>
                      <div className="w-full h-[160px] bg-gray-50 overflow-hidden relative border-b border-gray-100 flex items-center justify-center">
                        {img ? (
                          <img src={img} alt="썸네일" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <span className="text-gray-300 text-4xl font-black">No Image</span>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-[15px] font-black text-gray-900 group-hover:text-[#3b4890] line-clamp-2 break-all leading-snug mb-3">
                          {data.cleanTitle}
                        </h3>
                        <div className="mt-auto flex justify-between items-center text-[11px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-sm">{data.cat}</span>
                            <span className="text-gray-400 truncate max-w-[80px]">{author}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                          <span className="text-gray-400 text-[11px] font-medium flex items-center gap-1">
                            조회 {showcaseData.monthly.views || 0}
                          </span>
                          <span className="text-rose-500 font-black text-[13px] flex items-center gap-1">
                            ♥ {showcaseData.monthly.likes || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })()}

                {showcaseData.allTime && (() => {
                  const data = extractData(showcaseData.allTime.title);
                  const img = extractFirstImage(showcaseData.allTime.content);
                  const author = showcaseData.allTime.title.startsWith('[익명 다락방]') ? '익명' : showcaseData.allTime.author;
                  return (
                    <Link href={`/board/${showcaseData.allTime.id}${fromQuery}`} className="group block bg-white rounded-xl border border-yellow-300 shadow-md hover:shadow-xl hover:border-yellow-500 transition-all duration-300 relative overflow-hidden flex flex-col md:-translate-y-3 ring-1 ring-yellow-400/20">
                      <div className="absolute top-3 left-3 z-10">
                        <div className="bg-gradient-to-r from-gray-900 to-black text-yellow-400 text-[12px] font-black px-3 py-1.5 rounded-md shadow-lg border border-yellow-500/30 flex items-center gap-1">
                          <span className="text-sm">👑</span> 역대 장원 (1위)
                        </div>
                      </div>
                      <div className="w-full h-[160px] bg-gray-50 overflow-hidden relative border-b border-gray-100 flex items-center justify-center">
                        {img ? (
                          <img src={img} alt="썸네일" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <span className="text-gray-300 text-4xl font-black">No Image</span>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1 bg-gradient-to-b from-white to-yellow-50/30">
                        <h3 className="text-[15px] font-black text-gray-900 group-hover:text-yellow-700 line-clamp-2 break-all leading-snug mb-3">
                          {data.cleanTitle}
                        </h3>
                        <div className="mt-auto flex justify-between items-center text-[11px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-sm">{data.cat}</span>
                            <span className="text-gray-400 truncate max-w-[80px]">{author}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                          <span className="text-gray-400 text-[11px] font-medium flex items-center gap-1">
                            조회 {showcaseData.allTime.views || 0}
                          </span>
                          <span className="text-yellow-600 font-black text-[14px] flex items-center gap-1">
                            👑 {showcaseData.allTime.likes || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })()}

              </div>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-bold text-[15px] text-gray-800 mb-2">🏆 일반 명예의 전당 게시글</h3>
              </div>
            </div>
          )}

          <div className="border-t-2 border-gray-700 text-sm">
            <div className="hidden md:flex border-b border-gray-300 bg-gray-50 py-3 font-bold text-gray-600">
              <div className="w-12 text-center shrink-0">번호</div>
              <div className="flex-1 text-center">제목</div>
              <div className="w-24 text-center shrink-0">글쓴이</div>
              <div className="w-[70px] text-center shrink-0">날짜</div>
              <div className="w-12 text-center shrink-0">조회</div>
              <div className="w-12 text-center text-rose-500 shrink-0">공감</div>
            </div>

            {noticePosts.map((post: any) => {
              const postData = extractData(post.title);
              const isAnonymous = postData.cat === '익명 다락방';
              const displayAuthor = isAnonymous ? '익명' : post.author;

              const isGlobal = post.is_notice;
              const bgColor = isGlobal ? 'bg-rose-50/70 hover:bg-rose-100 border-rose-200' : 'bg-indigo-50/70 hover:bg-indigo-100 border-indigo-200';
              const textColor = isGlobal ? 'text-rose-600' : 'text-indigo-600';
              const titleColor = isGlobal ? 'text-rose-900' : 'text-indigo-900';
              const badgeText = isGlobal ? '공지' : '📌';
              const iconText = isGlobal ? '📢' : '📌';

              return (
                <div key={`notice-${post.id}`} className={`flex flex-col md:flex-row border-b py-3 transition-colors items-center group ${bgColor} active:scale-[0.98] md:active:scale-100 active:bg-gray-50/50 md:active:bg-transparent touch-pan-y md:touch-auto`}>
                  <div className={`hidden md:block w-12 text-center text-xs font-black shrink-0 ${textColor}`}>{badgeText}</div>
                  <Link href={`/board/${post.id}${fromQuery}`} prefetch={false} className="flex-1 min-w-0 px-3 md:px-4 w-full flex items-center cursor-pointer text-[15px]">
                    <span className="mr-2 text-[14px]">{iconText}</span>
                    {post.is_blinded ? (
                      <span className="truncate mr-1 text-gray-400 md:text-gray-500">블라인드 처리된 글입니다.</span>
                    ) : (
                      <>
                        <span className={`font-black ${titleColor} ${titleClasses}`}>{postData.cleanTitle}</span>
                        {hasImage(post.content) && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3.5 h-3.5 ml-0.5 shrink-0 ${isGlobal ? 'text-rose-400' : 'text-indigo-400'}`}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                        )}
                        {post.comment_count > 0 && (
                          <span className={`ml-1 text-[11px] sm:text-[12px] font-black shrink-0 ${textColor}`}>[{post.comment_count}]</span>
                        )}
                      </>
                    )}
                  </Link>
                  <div className={`flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-[11px] md:text-[13px] justify-between items-center shrink-0 ${textColor}`}>
                    <div className={`md:w-24 text-left md:text-center font-bold truncate`}>
                      {post.is_blinded ? '-' : displayAuthor}
                    </div>
                    <div className="md:w-[70px] md:text-center font-bold opacity-80">{formatDate(post.date)}</div>
                    <div className="md:w-12 md:text-center opacity-80">{post.is_blinded ? '-' : (post.views || 0)}</div>
                    <div className={`md:w-12 md:text-center font-black text-[13px] sm:text-[14px] ${post.is_blinded ? 'opacity-50' : (post.likes > 0 ? '' : 'opacity-70')}`}>
                      {post.is_blinded ? '-' : (post.likes || 0)}
                    </div>
                  </div>
                </div>
              );
            })}

            {renderTopPost && (() => {
              const topData = extractData(renderTopPost.title);
              const isAnonymousTop = topData.cat === '익명 다락방';
              const displayAuthorTop = isAnonymousTop ? '익명' : renderTopPost.author;
              const displayAuthorIdTop = isAnonymousTop ? null : renderTopPost.author_id;

              return (
                <div className="flex flex-col md:flex-row border-b border-gray-200 py-3 bg-blue-50/50 hover:bg-gray-50 transition-colors items-center group active:scale-[0.98] md:active:scale-100 active:bg-gray-50/50 md:active:bg-transparent touch-pan-y md:touch-auto">
                  <div className="hidden md:block w-12 text-center text-xs text-gray-500 font-bold shrink-0">장원</div>
                  <Link href={`/board/${renderTopPost.id}${fromQuery}`} prefetch={false} className="flex-1 min-w-0 px-3 md:px-4 w-full flex items-center cursor-pointer text-[15px]">
                    <CategoryIcon category={topData.cat} />
                    {renderTopPost.is_blinded ? (
                      <span className="truncate mr-1 text-gray-400 md:text-gray-500">
                        블라인드 처리된 글입니다.
                      </span>
                    ) : (
                      <>
                        <span className={`font-bold md:font-normal text-gray-900 md:text-gray-800 ${titleClasses}`}>{topData.cleanTitle}</span>
                        {hasImage(renderTopPost.content) && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 ml-0.5 text-gray-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                        )}
                        {renderTopPost.comment_count > 0 && (
                          <span className="ml-1 text-[11px] sm:text-[12px] font-bold text-[#3b4890] shrink-0">[{renderTopPost.comment_count}]</span>
                        )}
                      </>
                    )}
                  </Link>
                  <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-[11px] md:text-[13px] text-gray-400 md:text-gray-500 justify-between items-center shrink-0">
                    <div className="md:w-24 text-left md:text-center font-normal md:font-semibold text-gray-400 md:text-gray-700 truncate">
                      {renderTopPost.is_blinded ? (
                        <span>-</span>
                      ) : displayAuthorIdTop ? (
                        <>
                          <span className="md:hidden">{displayAuthorTop}</span>
                          <Link href={`/user/${displayAuthorIdTop}`} className="hidden md:inline hover:text-[#3b4890] hover:underline cursor-pointer">
                            {displayAuthorTop}
                          </Link>
                        </>
                      ) : (
                        <span>{displayAuthorTop}</span>
                      )}
                    </div>
                    <div className="md:w-[70px] md:text-center text-gray-400">{formatDate(renderTopPost.date)}</div>
                    <div className="md:w-12 md:text-center text-gray-400">{renderTopPost.is_blinded ? '-' : (renderTopPost.views || 0)}</div>
                    <div className={`md:w-12 md:text-center font-black text-[13px] sm:text-[14px] ${renderTopPost.is_blinded ? 'text-gray-300' : (renderTopPost.likes > 0 ? 'text-[#3b4890]' : 'text-gray-300')}`}>
                      {renderTopPost.is_blinded ? '-' : (renderTopPost.likes || 0)}
                    </div>
                  </div>
                </div>
              );
            })()}

            {renderPosts.length === 0 && !renderTopPost && noticePosts.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-medium">등록된 게시물이 없습니다.</div>
            ) : (
              renderPosts.map((post: any) => {
                const postData = extractData(post.title);
                const isAnonymous = postData.cat === '익명 다락방';
                const displayAuthor = isAnonymous ? '익명' : post.author;
                const displayAuthorId = isAnonymous ? null : post.author_id;

                return (
                  <div key={post.id} className="flex flex-col md:flex-row border-b border-gray-200 py-2.5 hover:bg-gray-50 transition-colors items-center group active:scale-[0.98] md:active:scale-100 active:bg-gray-50/50 md:active:bg-transparent touch-pan-y md:touch-auto">
                    <div className="hidden md:block w-12 text-center text-[13px] text-gray-400 shrink-0">{post.id}</div>
                    <Link href={`/board/${post.id}${fromQuery}`} prefetch={false} className="flex-1 min-w-0 px-3 md:px-4 w-full flex items-center cursor-pointer text-[15px]">
                      <CategoryIcon category={postData.cat} />

                      {post.is_blinded ? (
                        <span className="truncate mr-1 text-gray-400 md:text-gray-500">
                          블라인드 처리된 글입니다.
                        </span>
                      ) : (
                        <>
                          <span className={`font-bold md:font-normal text-gray-900 md:text-gray-800 ${titleClasses}`}>{postData.cleanTitle}</span>
                          {hasImage(post.content) && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 ml-0.5 text-gray-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                          )}
                          {post.comment_count > 0 && (
                            <span className="ml-1 text-[11px] sm:text-[12px] font-bold text-[#3b4890] shrink-0">[{post.comment_count}]</span>
                          )}
                        </>
                      )}
                    </Link>
                    <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-[11px] md:text-[13px] text-gray-400 md:text-gray-500 justify-between items-center shrink-0">
                      <div className="md:w-24 text-left md:text-center font-normal md:font-medium text-gray-400 md:text-gray-600 truncate">
                        {post.is_blinded ? (
                          <span>-</span>
                        ) : displayAuthorId ? (
                          <>
                            <span className="md:hidden">{displayAuthor}</span>
                            <Link href={`/user/${displayAuthorId}`} className="hidden md:inline hover:text-[#3b4890] hover:underline cursor-pointer">
                              {displayAuthor}
                            </Link>
                          </>
                        ) : (
                          <span>{displayAuthor}</span>
                        )}
                      </div>
                      <div className="md:w-[70px] md:text-center">{formatDate(post.date)}</div>
                      <div className="md:w-12 md:text-center">{post.is_blinded ? '-' : (post.views || 0)}</div>
                      <div className={`md:w-12 md:text-center font-black text-[13px] sm:text-[14px] ${post.is_blinded ? 'text-gray-300 md:text-gray-300' : (post.likes > 0 ? 'text-[#3b4890]' : 'text-gray-300 md:text-gray-300')}`}>
                        {post.is_blinded ? '-' : (post.likes || 0)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-center mt-6 mb-2 px-2">
            <form method="GET" action="/board" className="flex items-center w-full max-w-[400px] border-2 border-[#3b4890] rounded-full bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {category !== 'all' && <input type="hidden" name="category" value={category} />}
              {bestType && <input type="hidden" name="best" value={bestType} />}
              <select name="searchType" defaultValue={searchType} className="shrink-0 pl-3 sm:pl-4 pr-1 sm:pr-2 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-bold text-gray-600 bg-transparent outline-none cursor-pointer border-r border-gray-200 focus:text-[#3b4890]">
                <option value="title">제목</option>
                <option value="content">내용</option>
                <option value="author">글쓴이</option>
              </select>
              <input type="text" name="q" defaultValue={keyword} placeholder="검색어 입력" className="flex-1 min-w-0 px-2 sm:px-3 py-2 sm:py-2.5 text-[13px] sm:text-[14px] outline-none text-gray-800 placeholder-gray-400 bg-transparent" />
              <button type="submit" className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 text-white bg-[#3b4890] hover:bg-[#2a3042] font-bold transition-colors flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              </button>
            </form>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4 w-full">
            <div className="hidden md:block md:flex-1 shrink-0"></div>

            <div className="flex justify-center items-center gap-1 flex-wrap shrink-0">
              {page > 1 && (
                <Link href={getPageUrl(1)} scroll={false} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
                  <span className="hidden sm:inline">처음</span><span className="sm:hidden">{"<<"}</span>
                </Link>
              )}
              {startPage > 1 && (
                <Link href={getPageUrl(startPage - 1)} scroll={false} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
                  <span className="hidden sm:inline">이전</span><span className="sm:hidden">{"<"}</span>
                </Link>
              )}
              {visiblePages.map((p) => (
                <Link key={p} href={getPageUrl(p)} scroll={false} className={`px-2.5 sm:px-3 py-1.5 border rounded-sm font-bold text-[12px] transition-colors shrink-0 ${page === p ? 'bg-[#414a66] text-white border-[#414a66]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                  {p}
                </Link>
              ))}
              {endPage < totalPages && (
                <Link href={getPageUrl(endPage + 1)} scroll={false} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
                  <span className="hidden sm:inline">다음</span><span className="sm:hidden">{">"}</span>
                </Link>
              )}
            </div>

            <div className="w-full md:flex-1 flex justify-end shrink-0">
              {canWrite && (
                <Link href={`/board/write?category=${category}`} className="w-full md:w-auto px-5 py-2 bg-[#414a66] text-white rounded-sm text-sm font-bold hover:bg-[#2a3042] transition-colors flex items-center justify-center whitespace-nowrap">
                  글쓰기
                </Link>
              )}
            </div>
          </div>

        </main>
      </div>
      <HybridPrefetchTrigger />
    </>
  );
}