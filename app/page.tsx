import { sql } from '@vercel/postgres';
import Link from 'next/link';
import { cookies } from 'next/headers';
import Navbar from './board/Navbar';

export const dynamic = 'force-dynamic';

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

export default async function HomePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  const userIdCookie = cookieStore.get('ojemi_userid');
  const isAdmin = userIdCookie?.value === 'admin';

  const handleLogout = async () => {
    'use server';
    const store = await cookies();
    store.delete('ojemi_user');
    store.delete('ojemi_userid');
  };

  // 🚨 미나의 수술: 6개밖에 안 보이던 글을 가독성 최고 황금비율인 '10개(LIMIT 10)'로 대폭 늘렸습니다!
  const [bestResult, humorResult, emotionResult, freeResult, lifeResult, animalResult] = await Promise.all([
    sql`SELECT id, title, author, date, likes, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE likes >= 10 ORDER BY date DESC LIMIT 10`,
    sql`SELECT id, title, author, date, likes, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE '[유머]%' ORDER BY date DESC LIMIT 10`,
    sql`SELECT id, title, author, date, likes, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE '[감동]%' ORDER BY date DESC LIMIT 10`,
    sql`SELECT id, title, author, date, likes, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE '[자유게시판]%' ORDER BY date DESC LIMIT 10`,
    sql`SELECT id, title, author, date, likes, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE '[세상사는 이야기]%' ORDER BY date DESC LIMIT 10`,
    sql`SELECT id, title, author, date, likes, (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count FROM posts WHERE title LIKE '[귀여운 동물들]%' OR title LIKE '[동물]%' ORDER BY date DESC LIMIT 10`,
  ]);

  const bestPosts = bestResult.rows;
  const humorPosts = humorResult.rows;
  const emotionPosts = emotionResult.rows;
  const freePosts = freeResult.rows;
  const lifePosts = lifeResult.rows;
  const animalPosts = animalResult.rows;

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
                  <span className="text-[14px] text-gray-800 font-medium truncate hover:underline">{cleanTitle}</span>
                  {post.comment_count > 0 && (
                    <span className="ml-1.5 text-[11px] font-bold text-rose-500 flex-shrink-0">[{post.comment_count}]</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {post.likes > 0 && (
                    <span className="text-[11px] font-bold text-rose-500">♥{post.likes}</span>
                  )}
                  <span className="text-[11px] text-gray-400 w-10 text-right">{formatShortDate(post.date)}</span>
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
              반갑습니다! <span className="text-[#aeb7db]">커뮤니티 오재미</span>입니다.
            </h1>
            <p className="text-sm md:text-base text-gray-300 font-medium">
              함께 웃고, 나누고, 소통하는 우리들의 따뜻한 공간입니다.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            {currentUser ? (
              <>
                <div className="text-gray-200 text-sm font-medium">
                  <span className="text-white font-black text-base">{currentUser}</span> 님, 환영합니다!
                </div>
                <div className="flex items-center gap-2">
                  
                  {isAdmin && (
                    <Link href="/admin" className="px-4 py-2 bg-red-600 text-white text-sm font-black rounded-sm hover:bg-red-700 transition-colors shadow-sm">
                      ADMIN
                    </Link>
                  )}

                  <Link href="/profile" className="px-4 py-2 bg-[#2a3042] text-white text-sm font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm">
                    내정보
                  </Link>
                  <form action={handleLogout}>
                    <button type="submit" className="px-4 py-2 bg-[#2a3042] text-white text-sm font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm">
                      로그아웃
                    </button>
                  </form>
                  <Link href="/board/write" className="px-5 py-2 bg-[#ebedf5] text-[#3b4890] text-sm font-black rounded-sm shadow-md hover:bg-white transition-colors ml-1">
                    ✏️ 글쓰기
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="text-gray-300 text-sm font-bold">
                  오재미를 더 편리하게 이용하세요.
                </div>
                <div className="flex items-center gap-2">
                  {/* 🚨 미나의 스마트 로그인 동선 설계: 로그인 버튼을 누르면 "나 대문(/)에서 왔어!" 라고 알려줍니다 */}
                  <Link href="/login?redirect=/" className="px-8 py-2 bg-[#ebedf5] text-[#3b4890] text-sm font-black rounded-sm shadow-md hover:bg-white transition-colors">
                    로그인
                  </Link>
                  <Link href="/signup" className="px-6 py-2 bg-[#2a3042] text-white text-sm font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm">
                    회원가입
                  </Link>
                </div>
              </>
            )}
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BoardWidget title="투데이 베스트" icon="🔥" link="/board?best=today" posts={bestPosts} highlight={true} />
          <BoardWidget title="유머" icon="😆" link="/board?category=유머" posts={humorPosts} />
          <BoardWidget title="나누고 싶은 감동" icon="💖" link="/board?category=감동" posts={emotionPosts} />
          <BoardWidget title="자유게시판" icon="💬" link="/board?category=자유게시판" posts={freePosts} />
          <BoardWidget title="세상사는 이야기" icon="☕" link="/board?category=세상사는 이야기" posts={lifePosts} />
          <BoardWidget title="귀여운 동물들" icon="🐾" link="/board?category=귀여운 동물들" posts={animalPosts} />
        </div>
      </main>
    </div>
  );
}