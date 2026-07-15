// 파일 위치: app/page.tsx
import type { Metadata } from 'next';
import { sql } from '@vercel/postgres';
import Link from 'next/link';
import { cookies } from 'next/headers';
import Navbar from './board/Navbar';
import CategoryIcon from './board/CategoryIcon';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

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

function formatShortDate(dateString: any) {
  const dbDate = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(dbDate);
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${month}-${day}`;
}

function extractThumbnail(content: string) {
  if (!content) return null;

  const ytMatch = content.match(/<iframe[^>]+src=["'](?:https?:)?\/\/www\.youtube\.com\/embed\/([^"'?]+)/i);
  if (ytMatch) return { type: 'youtube', url: `https://img.youtube.com/vi/${ytMatch[1]}/0.jpg` };

  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return { type: 'image', url: imgMatch[1] };

  const posterMatch = content.match(/<video[^>]+poster=["']([^"']+)["']/i);
  if (posterMatch && posterMatch[1]) return { type: 'image', url: posterMatch[1] };

  const videoMatch = content.match(/<video[^>]+src=["']([^"']+)["']/i) || content.match(/<source[^>]+src=["']([^"']+)["']/i);
  if (videoMatch) {
    const videoUrl = videoMatch[1].includes('#t=') ? videoMatch[1] : `${videoMatch[1]}#t=0.001`;
    return { type: 'mp4', url: videoUrl };
  }

  return null;
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('humorin_user');
  const currentUser = userCookie ? userCookie.value : null;

  const userIdCookie = cookieStore.get('humorin_userid');
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  let isAdmin = false;
  if (currentUserId) {
    try {
      const { rows } = await sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (rows.length > 0 && rows[0].is_admin === true) {
        isAdmin = true;
      }
    } catch (e) {
      console.error("관리자 권한 확인 에러:", e);
    }
  }

  const handleLogout = async () => {
    'use server';
    const store = await cookies();
    store.delete('humorin_user');
    store.delete('humorin_userid');
    store.delete('humorin_signature');
  };

  let mainBoards: any[] = [];
  try {
    const { rows } = await sql`SELECT * FROM boards WHERE is_main_visible = true ORDER BY main_sort_order ASC, id ASC`;
    mainBoards = rows;
  } catch (e) {
    console.error("메인 보드 불러오기 에러", e);
  }

  let mainBannerTitle = '세상의 모든 웃음이 있는 곳 유머인 입니다.';
  let mainBannerSubtitle = '함께 웃고, 나누고, 소통하는 우리들의 따뜻한 공간 유머인.';
  try {
    const { rows: settings } = await sql`SELECT key, value FROM site_settings WHERE key IN ('main_banner_title', 'main_banner_subtitle')`;
    settings.forEach(row => {
      if (row.key === 'main_banner_title' && row.value) mainBannerTitle = row.value;
      if (row.key === 'main_banner_subtitle' && row.value) mainBannerSubtitle = row.value;
    });
  } catch (e) { }

  const bestQuery = sql`
    SELECT p.id, p.title, p.content, p.author, p.date, p.best_at, p.likes, p.is_blinded, 
           (SELECT COUNT(*) FROM comments WHERE comments.post_id = p.id) as comment_count 
    FROM posts p 
    JOIN boards b ON p.category = b.name 
    WHERE p.likes >= 10 AND COALESCE(p.dislikes, 0) < 10 AND b.allow_best = true 
    ORDER BY p.best_at DESC NULLS LAST, p.date DESC 
    LIMIT 10
  `;

  const allPostsQuery = sql`
    SELECT p.id, p.title, p.content, p.author, p.date, p.likes, p.is_blinded, 
           (SELECT COUNT(*) FROM comments WHERE comments.post_id = p.id) as comment_count 
    FROM posts p 
    JOIN boards b ON p.category = b.name 
    WHERE b.is_all_visible = true 
    ORDER BY p.date DESC 
    LIMIT 10
  `;

  const boardQueries = mainBoards.map(board => {
    const pattern = `[${board.name}]%`;
    return sql`
      SELECT id, title, content, author, date, likes, is_blinded, 
             (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count 
      FROM posts 
      WHERE title LIKE ${pattern} 
      ORDER BY date DESC 
      LIMIT 10
    `;
  });

  const results = await Promise.all([bestQuery, allPostsQuery, ...boardQueries]);

  const bestPosts = results[0].rows;
  const allRecentPosts = results[1].rows;
  const dynamicBoardPosts = results.slice(2).map(res => res.rows);

  const BoardWidget = ({ title, icon, link, posts, highlight = false }: any) => {
    const querySuffix = link.includes('?') ? link.substring(link.indexOf('?')) : '';

    return (
      <div className={`bg-white border ${highlight ? 'border-[#3b4890] shadow-md' : 'border-gray-200 shadow-sm'} rounded-sm overflow-hidden flex flex-col`}>
        <div className={`flex justify-between items-center px-4 py-3 border-b ${highlight ? 'bg-[#3b4890] border-[#3b4890]' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`font-black text-[15px] flex items-center gap-1.5 ${highlight ? 'text-white' : 'text-[#3b4890]'}`}>
            <span className="flex items-center">{icon}</span> {title}
          </h3>
          <Link href={link} className={`text-xs font-bold transition-colors ${highlight ? 'text-indigo-200 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            더보기 &gt;
          </Link>
        </div>
        <ul className="divide-y divide-gray-100 flex-1">
          {posts.length > 0 ? posts.map((post: any) => {
            const { cleanTitle } = extractData(post.title);
            const thumb = extractThumbnail(post.content);

            return (
              <li key={`widget-${post.id}`} className="hover:bg-gray-50 transition-colors">
                <Link href={`/board/${post.id}${querySuffix}`} className="flex items-start md:items-center justify-between px-4 py-2.5 gap-3 md:gap-0">
                  
                  <div className="flex flex-col md:flex-row md:items-center flex-1 min-w-0 pr-0 md:pr-3">
                    <div className="flex items-center md:inline-flex min-w-0">
                      {post.is_blinded ? (
                        <span className="text-[14px] text-gray-400 md:text-gray-500 truncate">블라인드 처리된 글입니다.</span>
                      ) : (
                        <>
                          <span className="text-[15px] text-gray-900 md:text-gray-800 font-semibold md:font-medium hover:underline line-clamp-2 md:line-clamp-none md:truncate break-all md:break-normal whitespace-normal md:whitespace-nowrap leading-snug">
                            {cleanTitle}
                          </span>
                          {post.comment_count > 0 && (
                            <span className="ml-1.5 text-[10px] sm:text-[11px] font-bold text-[#3b4890] flex-shrink-0">[{post.comment_count}]</span>
                          )}
                        </>
                      )}
                    </div>
                    
                    {!post.is_blinded && (
                      <div className="flex md:hidden items-center gap-2 flex-shrink-0 mt-1">
                        {post.likes > 0 && <span className="text-[12px] font-black text-[#3b4890]">♥{post.likes}</span>}
                        <span className="text-[11px] text-gray-400">{formatShortDate(post.date)}</span>
                      </div>
                    )}
                  </div>

                  <div className="hidden md:flex items-center gap-2 flex-shrink-0 mt-0.5">
                    {post.is_blinded ? (
                      <span className="text-[11px] text-gray-400 w-10 text-right">-</span>
                    ) : (
                      <>
                        {post.likes > 0 && <span className="text-[13px] font-black text-[#3b4890]">♥{post.likes}</span>}
                        <span className="text-[11px] text-gray-400 w-10 text-right">{formatShortDate(post.date)}</span>
                      </>
                    )}
                  </div>

                  {thumb && !post.is_blinded && (
                    <div className="md:hidden shrink-0 w-[55px] h-[55px] rounded-lg overflow-hidden relative border border-gray-100 bg-gray-50 flex items-center justify-center">
                      {thumb.type === 'mp4' ? (
                        <video src={thumb.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        <img src={thumb.url} alt="thumbnail" className="w-full h-full object-cover" loading="lazy" />
                      )}
                      {(thumb.type === 'youtube' || thumb.type === 'mp4') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-white text-[10px] ml-0.5">▶</span>
                        </div>
                      )}
                    </div>
                  )}

                </Link>
              </li>
            );
          }) : (
            <li className="py-10 text-center text-sm font-bold text-gray-400">등록된 게시물이 없습니다.</li>
          )}
        </ul>
      </div>
    );
  };

  const renderTitle = (title: string) => {
    return title.split(/(유머인)/g).map((part, i) =>
      part === '유머인' ? <span key={i} className="text-yellow-400 whitespace-nowrap">{part}</span> : part
    );
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f5f7]"></div>}>
      <div className="min-h-screen bg-[#f4f5f7] font-sans text-gray-800">
        <Navbar />
        {/* 💡 [v43.5 완벽 동기화] 스마트폰 환경에서 상하 여백(py-2, mb-6)을 맞춰 길이를 게시판과 동일하게 세팅, 좌우는 px-1 적용 */}
        <main className="max-w-[1200px] mx-auto px-1 py-2 mb-6 md:p-4 md:py-8 md:mb-10">

          <div className="hidden md:flex bg-[#414a66] rounded-sm p-6 md:p-10 mb-8 shadow-sm flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2" style={{ wordBreak: 'keep-all' }}>
                {renderTitle(mainBannerTitle)}
              </h1>
              <p className="text-sm md:text-base text-gray-300 font-medium" style={{ wordBreak: 'keep-all' }}>
                {mainBannerSubtitle}
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-3">
              {currentUser ? (
                <>
                  <div className="text-gray-200 text-sm font-medium">
                    <span className="text-white font-black text-base">{currentUser}</span> 님, 환영합니다!
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-2">
                    {isAdmin && (
                      <Link href="/admin" className="px-3 sm:px-4 py-2 bg-red-600 text-white text-sm font-black rounded-sm hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap shrink-0">
                        ADMIN
                      </Link>
                    )}
                    <Link href="/profile" className="px-3 sm:px-4 py-2 bg-[#2a3042] text-white text-sm font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap shrink-0">
                      내정보
                    </Link>
                    <form action={handleLogout} className="shrink-0">
                      <button type="submit" className="px-3 sm:px-4 py-2 bg-[#2a3042] text-white text-sm font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap shrink-0">
                        로그아웃
                      </button>
                    </form>
                    <Link href="/board/write" className="px-4 sm:px-5 py-2 bg-[#ebedf5] text-[#3b4890] text-sm font-black rounded-sm shadow-md hover:bg-white transition-colors ml-0 sm:ml-1 whitespace-nowrap shrink-0">
                      ✏️ 글쓰기
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-gray-300 text-sm font-bold">
                    유머인을 더 편리하게 이용하세요.
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
                    <Link href="/login?redirect=/" className="px-6 sm:px-8 py-2 bg-[#ebedf5] text-[#3b4890] text-sm font-black rounded-sm shadow-md hover:bg-white transition-colors whitespace-nowrap shrink-0">
                      로그인
                    </Link>
                    <Link href="/signup" className="px-4 sm:px-6 py-2 bg-[#2a3042] text-white text-sm font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap shrink-0">
                      회원가입
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BoardWidget title="투데이 베스트" icon="🔥" link="/board?best=today" posts={bestPosts} highlight={true} />
            <BoardWidget title="전체 새글 보기" icon="📝" link="/board" posts={allRecentPosts} />

            {mainBoards.map((board, index) => (
              <BoardWidget
                key={board.id}
                title={board.name}
                icon={<CategoryIcon category={board.name} />}
                link={`/board?category=${board.name}`}
                posts={dynamicBoardPosts[index]}
              />
            ))}
          </div>

          <Link 
            href="/board/write" 
            className="md:hidden fixed bottom-6 right-4 w-[52px] h-[52px] bg-[#3b4890] rounded-full shadow-[0_4px_14px_rgba(59,72,144,0.4)] flex items-center justify-center text-white text-xl z-50 hover:bg-[#2a3042] transition-all border-2 border-white"
            aria-label="글쓰기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.712 3.712 1.158-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
            </svg>
          </Link>

        </main>
      </div>
    </Suspense>
  );
}