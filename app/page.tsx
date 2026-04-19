import type { Metadata } from 'next';
import { sql } from '@vercel/postgres';
import Link from 'next/link';
import { cookies } from 'next/headers';
import Navbar from './board/Navbar';

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
  const kstDate = new Date(dbDate.getTime() + 9 * 60 * 60 * 1000);
  return `${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')}`;
}

function getIconForCategory(category: string) {
  if (category.includes('유머')) return '😆';
  if (category.includes('감동')) return '💖';
  if (category.includes('세상')) return '☕';
  if (category.includes('흥미')) return '💡';
  if (category.includes('동물')) return '🐾';
  if (category.includes('정보') || category.includes('상식')) return '📘';
  if (category.includes('질문')) return '❓';
  if (category.includes('자유')) return '💬';

  const randomEmojis = [
    '🚀', '🌟', '💎', '🌈', '🎯', '🎨', '🧩', '🎧', '🍿', '🎈',
    '🔮', '🏆', '🍔', '🍺', '🏕️', '🛸', '🎸', '🎮', '📸', '🍀',
    '☀️', '🌙', '⚡', '🔥', '👑', '🍒', '🍉', '🌴', '🌻', '🐶',
    '🐱', '🐳', '🍩', '🍷', '🛹', '✈️', '⛵', '城堡', '🎡', '💎'
  ];

  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % randomEmojis.length;
  return randomEmojis[index];
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  const userIdCookie = cookieStore.get('ojemi_userid');
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
    store.delete('ojemi_user');
    store.delete('ojemi_userid');
    store.delete('ojemi_signature'); 
  };

  let mainBoards: any[] = [];
  try {
    const { rows } = await sql`SELECT * FROM boards WHERE is_main_visible = true ORDER BY main_sort_order ASC, id ASC`;
    mainBoards = rows;
  } catch (e) {
    console.error("메인 보드 불러오기 에러", e);
  }

  const bestQuery = sql`SELECT id, title, author, date, best_at, likes, is_blinded, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 10 ORDER BY best_at DESC NULLS LAST, date DESC LIMIT 10`;
  const allPostsQuery = sql`SELECT id, title, author, date, likes, is_blinded, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts ORDER BY date DESC LIMIT 10`;
  
  const boardQueries = mainBoards.map(board => {
    const pattern = `[${board.name}]%`; 
    return sql`SELECT id, title, author, date, likes, is_blinded, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE ${pattern} ORDER BY date DESC LIMIT 10`;
  });

  const results = await Promise.all([bestQuery, allPostsQuery, ...boardQueries]);
  
  const bestPosts = results[0].rows; 
  const allRecentPosts = results[1].rows; 
  const dynamicBoardPosts = results.slice(2).map(res => res.rows); 

  const BoardWidget = ({ title, icon, link, posts, highlight = false }: any) => (
    <div className={`bg-white border ${highlight ? 'border-[#3b4890] shadow-md' : 'border-gray-200 shadow-sm'} rounded-sm overflow-hidden flex flex-col`}>
      <div className={`flex justify-between items-center px-4 py-3 border-b ${highlight ? 'bg-[#3b4890] border-[#3b4890]' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`font-black text-[15px] flex items-center gap-1.5 ${highlight ? 'text-white' : 'text-[#3b4890]'}`}>
          <span>{icon}</span> {title}
        </h3>
        <Link href={link} className={`text-xs font-bold transition-colors ${highlight ? 'text-indigo-200 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
          더보기 &gt;
        </Link>
      </div>
      <ul className="divide-y divide-gray-100 flex-1">
        {posts.length > 0 ? posts.map((post: any) => {
          const { cleanTitle } = extractData(post.title);
          return (
            <li key={`widget-${post.id}`} className="hover:bg-gray-50 transition-colors">
              <Link href={`/board/${post.id}`} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center flex-1 min-w-0 pr-3">
                  {post.is_blinded ? (
                    <span className="text-[14px] text-gray-400 md:text-gray-500 truncate">블라인드 처리된 글입니다.</span>
                  ) : (
                    <>
                      <span className="text-[14px] text-gray-900 md:text-gray-800 font-bold md:font-medium truncate hover:underline">{cleanTitle}</span>
                      {post.comment_count > 0 && (
                        <span className="ml-1.5 text-[10px] sm:text-[11px] font-bold text-[#3b4890] flex-shrink-0">[{post.comment_count}]</span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {post.is_blinded ? (
                     <span className="text-[11px] text-gray-400 w-10 text-right">-</span>
                  ) : (
                    <>
                      {post.likes > 0 && (
                        <span className="text-[12px] sm:text-[13px] font-black text-[#3b4890]">♥{post.likes}</span>
                      )}
                      <span className="text-[11px] text-gray-400 w-10 text-right">{formatShortDate(post.date)}</span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          );
        }) : (
          <li className="py-10 text-center text-sm font-bold text-gray-400">등록된 게시물이 없습니다.</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f5f7] font-sans text-gray-800">
      <Navbar />
      <main className="max-w-[1200px] mx-auto p-4 md:py-8 mb-20">
        
        <div className="bg-[#414a66] rounded-sm p-6 md:p-10 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
              반갑습니다! 세상의 모든 재미 <span className="text-yellow-400">오재미</span> 입니다.
            </h1>
            <p className="text-sm md:text-base text-gray-300 font-medium">
              함께 웃고, 나누고, 소통하는 우리들의 따뜻한 공간 오재미.
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
                  오재미를 더 편리하게 이용하세요.
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
              icon={getIconForCategory(board.name)} 
              link={`/board?category=${board.name}`} 
              posts={dynamicBoardPosts[index]} 
            />
          ))}
        </div>
      </main>
    </div>
  );
}