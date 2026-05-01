// 파일 위치: app/board/page.tsx
// @ts-nocheck
import { sql } from '@vercel/postgres';
import Link from 'next/link';
import { cookies } from 'next/headers';
import CategoryIcon from './CategoryIcon'; // 💡 1단계에서 만든 부품 상자를 연결합니다.

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

export default async function BoardPage(props: any) {
  const searchParams = await props.searchParams;
  const bestType = searchParams.best || ''; 
  const category = searchParams.category || 'all';
  const page = searchParams.page ? Number(searchParams.page) : 1;
  
  const keyword = searchParams.q || ''; 
  const searchType = searchParams.searchType || 'title'; 

  let fromQuery = '';
  if (bestType === 'today') fromQuery = '?from=today';
  else if (bestType === '100') fromQuery = '?from=100';
  else if (bestType === '1000') fromQuery = '?from=1000';
  else if (category === 'all' && !keyword) fromQuery = '?from=all';

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
  } catch (e) {
    console.error("사이드바 게시판 불러오기 실패");
  }

  if (page === 1 && !keyword) {
    try {
      const { rows } = await sql`
        SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count 
        FROM posts 
        WHERE is_notice = true AND COALESCE(status, 'published') = 'published'
        ORDER BY date DESC
      `;
      noticePosts = rows;
    } catch (e) {
      console.log("공지사항 컬럼이 아직 없습니다.");
    }
  }

  const categoryPattern = category !== 'all' ? `%[${category}]%` : '%';

  if (category !== 'all' && !keyword && bestType === '' && page === 1) {
    const { rows: topRows } = await sql`
      SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count 
      FROM posts 
      WHERE title LIKE ${categoryPattern} AND date >= NOW() - INTERVAL '48 hours' AND likes >= 3 AND COALESCE(status, 'published') = 'published'
      ORDER BY likes DESC, views DESC LIMIT 1
    `;
    if (topRows.length > 0) topPost = topRows[0];
  }

  if (keyword) {
    const searchPattern = `%${keyword}%`;
    let countRes, rowsRes;

    if (searchType === 'title') {
      countRes = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND title ILIKE ${searchPattern} AND COALESCE(status, 'published') = 'published'`;
      rowsRes = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND title ILIKE ${searchPattern} AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (searchType === 'content') {
      countRes = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND content ILIKE ${searchPattern} AND COALESCE(status, 'published') = 'published'`;
      rowsRes = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND content ILIKE ${searchPattern} AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (searchType === 'author') {
      countRes = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND author ILIKE ${searchPattern} AND COALESCE(status, 'published') = 'published'`;
      rowsRes = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND author ILIKE ${searchPattern} AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
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
  else if (bestType === '100') {
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
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title LIKE ${categoryPattern} AND COALESCE(status, 'published') = 'published'`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT posts.*, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${categoryPattern} AND COALESCE(status, 'published') = 'published' ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const noticeIds = new Set(noticePosts.map(p => p.id));
  const renderPosts = posts.filter((p: any) => !noticeIds.has(p.id) && (!topPost || p.id !== topPost.id));
  const renderTopPost = topPost && !noticeIds.has(topPost.id) ? topPost : null;
  const canWrite = bestType === ''; 

  const getPageUrl = (pageNum: number) => {
    let url = `/board?page=${pageNum}`;
    if (keyword) url += `&q=${keyword}&searchType=${searchType}`;
    if (bestType) url += `&best=${bestType}`;
    if (category !== 'all') url += `&category=${category}`;
    return url;
  };

  const maxPageButtons = 5;
  let startPage = Math.max(1, page - 2);
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  
  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  
  const visiblePages = [];
  for (let i = startPage; i <= endPage; i++) {
    visiblePages.push(i);
  }

  return (
    <>
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
              {keyword ? `'${keyword}' 검색 결과 (${totalCount}건)` : 
               bestType === 'today' ? '🔥 투데이 베스트 (추천 10+)' : 
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
              return (
                <div key={`notice-${post.id}`} className="flex flex-col md:flex-row border-b border-indigo-200 py-3 bg-indigo-50/70 hover:bg-indigo-100 transition-colors items-center group">
                  <div className="hidden md:block w-12 text-center text-xs font-black text-indigo-600 shrink-0">공지</div>
                  <Link href={`/board/${post.id}${fromQuery}`} className="flex-1 min-w-0 px-3 md:px-4 w-full flex items-center cursor-pointer text-[15px]">
                    <span className="mr-2 text-[14px]">📢</span>
                    {post.is_blinded ? (
                      <span className="truncate mr-1 text-gray-400 md:text-gray-500">블라인드 처리된 글입니다.</span>
                    ) : (
                      <>
                        <span className="truncate group-hover:underline mr-1 font-black text-indigo-900">{postData.cleanTitle}</span>
                        {hasImage(post.content) && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 ml-0.5 text-indigo-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                        )}
                        {post.comment_count > 0 && (
                          <span className="ml-1 text-[11px] sm:text-[12px] font-black text-indigo-600 shrink-0">[{post.comment_count}]</span>
                        )}
                      </>
                    )}
                  </Link>
                  <div className="flex w-full md:w-auto mt-1 md:mt-0 px-3 md:px-0 text-[11px] md:text-[13px] text-indigo-500 justify-between items-center shrink-0">
                    <div className="md:w-24 text-left md:text-center font-bold text-indigo-700 truncate">
                      {post.is_blinded ? '-' : post.author}
                    </div>
                    <div className="md:w-[70px] md:text-center font-bold text-indigo-500">{formatDate(post.date)}</div>
                    <div className="md:w-12 md:text-center text-indigo-500">{post.is_blinded ? '-' : (post.views || 0)}</div>
                    <div className={`md:w-12 md:text-center font-black text-[13px] sm:text-[14px] ${post.is_blinded ? 'text-indigo-300' : (post.likes > 0 ? 'text-indigo-600' : 'text-indigo-400')}`}>
                      {post.is_blinded ? '-' : (post.likes || 0)}
                    </div>
                  </div>
                </div>
              );
            })}

            {renderTopPost && (() => {
              const topData = extractData(renderTopPost.title);
              return (
                <div className="flex flex-col md:flex-row border-b border-gray-200 py-3 bg-blue-50/50 hover:bg-gray-50 transition-colors items-center group">
                  <div className="hidden md:block w-12 text-center text-xs text-gray-500 font-bold shrink-0">장원</div>
                  <Link href={`/board/${renderTopPost.id}${fromQuery}`} className="flex-1 min-w-0 px-3 md:px-4 w-full flex items-center cursor-pointer text-[15px]">
                    <CategoryIcon category={topData.cat} />
                    
                    {renderTopPost.is_blinded ? (
                      <span className="truncate mr-1 text-gray-400 md:text-gray-500">
                        블라인드 처리된 글입니다.
                      </span>
                    ) : (
                      <>
                        <span className="truncate group-hover:underline mr-1 font-bold md:font-normal text-gray-900 md:text-gray-800">{topData.cleanTitle}</span>
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
                      ) : renderTopPost.author_id ? (
                        <>
                          <span className="md:hidden">{renderTopPost.author}</span>
                          <Link href={`/user/${renderTopPost.author_id}`} className="hidden md:inline hover:text-[#3b4890] hover:underline cursor-pointer">
                            {renderTopPost.author}
                          </Link>
                        </>
                      ) : (
                        <span>{renderTopPost.author}</span>
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
                return (
                  <div key={post.id} className="flex flex-col md:flex-row border-b border-gray-200 py-2.5 hover:bg-gray-50 transition-colors items-center group">
                    <div className="hidden md:block w-12 text-center text-[13px] text-gray-400 shrink-0">{post.id}</div>
                    <Link href={`/board/${post.id}${fromQuery}`} className="flex-1 min-w-0 px-3 md:px-4 w-full flex items-center cursor-pointer text-[15px]">
                      <CategoryIcon category={postData.cat} />
                      
                      {post.is_blinded ? (
                        <span className="truncate mr-1 text-gray-400 md:text-gray-500">
                          블라인드 처리된 글입니다.
                        </span>
                      ) : (
                        <>
                          <span className="truncate group-hover:underline mr-1 font-bold md:font-normal text-gray-900 md:text-gray-800">{postData.cleanTitle}</span>
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
                        ) : post.author_id ? (
                          <>
                            <span className="md:hidden">{post.author}</span>
                            <Link href={`/user/${post.author_id}`} className="hidden md:inline hover:text-[#3b4890] hover:underline cursor-pointer">
                              {post.author}
                            </Link>
                          </>
                        ) : (
                          <span>{post.author}</span>
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

          {/* 💡 [수술 3] 페이지네이션 및 하단 버튼 반응형 완벽 개선 (끝 버튼 삭제로 DB 렉 폭탄 방어) */}
          <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4 w-full">
            <div className="hidden md:block md:flex-1 shrink-0"></div> 
            
            <div className="flex justify-center items-center gap-1 flex-wrap shrink-0">
              {page > 1 && (
                <>
                  <Link href={getPageUrl(1)} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
                    <span className="hidden sm:inline">처음</span>
                    <span className="sm:hidden">{"<<"}</span>
                  </Link>
                  <Link href={getPageUrl(page - 1)} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
                    <span className="hidden sm:inline">이전</span>
                    <span className="sm:hidden">{"<"}</span>
                  </Link>
                </>
              )}
              {visiblePages.map((p) => (
                <Link key={p} href={getPageUrl(p)} className={`px-2.5 sm:px-3 py-1.5 border rounded-sm font-bold text-[12px] transition-colors shrink-0 ${page === p ? 'bg-[#414a66] text-white border-[#414a66]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                  {p}
                </Link>
              ))}
              {page < totalPages && (
                <>
                  <Link href={getPageUrl(page + 1)} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
                    <span className="hidden sm:inline">다음</span>
                    <span className="sm:hidden">{">"}</span>
                  </Link>
                  {/* 🚨 악성 부하를 일으키는 '끝(>>)' 버튼은 대형 커뮤니티 표준에 따라 영구 삭제됨 */}
                </>
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
    </>
  );
}