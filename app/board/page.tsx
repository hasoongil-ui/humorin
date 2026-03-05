import { sql } from '@vercel/postgres';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(dateString: any) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 💡 미나의 마법: 본문에서 첫 번째 사진 주소만 쏙! 뽑아내는 마법의 주문입니다.
function getFirstImage(content: string) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

export default async function BoardPage(props: any) {
  const searchParams = await props.searchParams;
  const bestCount = searchParams.best ? Number(searchParams.best) : 0;
  const keyword = searchParams.q || ''; 
  const page = searchParams.page ? Number(searchParams.page) : 1;
  
  // 💡 미나의 센스: 갤러리형은 글이 꽉 차 보여야 예쁘므로, 한 페이지에 5개 -> 12개로 넉넉히 늘렸습니다!
  const limit = 12; 
  const offset = (page - 1) * limit; 

  let posts;
  let totalCount = 0; 
  
  if (keyword && bestCount > 0) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= ${bestCount} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'})`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestCount} AND (title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}) ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (keyword) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE title ILIKE ${'%' + keyword + '%'} OR author ILIKE ${'%' + keyword + '%'} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else if (bestCount > 0) {
    const countResult = await sql`SELECT COUNT(*) FROM posts WHERE likes >= ${bestCount}`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts WHERE likes >= ${bestCount} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) FROM posts`;
    totalCount = Number(countResult.rows[0].count);
    const { rows } = await sql`SELECT * FROM posts ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    posts = rows;
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const menus = [
    { name: '💯 백베스트', link: '/board?best=3' }, 
    { name: '👑 천베스트', link: '/board?best=5' },
    { name: '투데이 베스트', link: '/board' },
    { name: '전체글 보기', link: '/board' },
    { name: '유머', link: '/board' },
    { name: '감동', link: '/board' },
    { name: '공포', link: '/board' },
    { name: '일상', link: '/board' },
    { name: '그냥 혼잣말', link: '/board' },
    { name: '핫뉴스', link: '/board' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-[#3b4890]">OJEMI</Link>
        </div>
      </header>

      <nav className="bg-[#3b4890] text-gray-300 relative z-40 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-wrap relative">
          {menus.map((menu) => (
            <Link href={menu.link} key={menu.name} className="relative group px-4 py-3 cursor-pointer block">
              <span className="font-bold text-sm group-hover:text-white transition-colors">{menu.name}</span>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0 hidden group-hover:block z-50">
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-transparent border-b-white mx-auto"></div>
                <div className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 border border-gray-300 shadow-lg whitespace-nowrap rounded-sm">
                  {menu.name} 바로가기
                </div>
              </div>
            </Link>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 md:p-6 mt-4 mb-20">
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-4">
            <h2 className="text-2xl font-black text-gray-800">
              {keyword ? `🔍 '${keyword}' 검색 결과 (${totalCount}건)` : (bestCount > 0 ? `🏆 명예의 전당 (추천 ${bestCount}개 이상)` : '전체글 보기')}
            </h2>
            <Link href="/board/write" className="w-full md:w-auto text-center px-8 py-3 bg-[#3b4890] text-white rounded-lg font-black hover:bg-[#222b5c] shadow-md transition-all transform hover:scale-105">
              ✍️ 폼나게 글쓰기
            </Link>
          </div>

          {/* 🎨 미나의 갤러리 디자인 적용 구역! (딱딱한 표를 지우고 예쁜 카드 그리드로 변경) */}
          {posts.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold text-lg">
              {keyword ? '검색된 명품 글이 없습니다.' : '아직 등록된 명품 글이 없습니다.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {posts.map((post) => {
                const thumbnail = getFirstImage(post.content); // 💡 본문에서 썸네일 추출!
                
                return (
                  <Link href={`/board/${post.id}`} key={post.id} className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1">
                    
                    {/* 썸네일 영역 */}
                    <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden flex items-center justify-center border-b">
                      {thumbnail ? (
                        <img src={thumbnail} alt="썸네일" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="text-gray-200 font-black text-3xl group-hover:scale-110 transition-transform duration-500">OJEMI</div>
                      )}
                      {/* 추천 뱃지 */}
                      {post.likes > 0 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                          👍 {post.likes}
                        </div>
                      )}
                    </div>

                    {/* 텍스트 정보 영역 */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-3 group-hover:text-[#3b4890] transition-colors flex-1 leading-snug">
                        {post.title}
                      </h3>
                      <div className="flex justify-between items-end text-xs text-gray-500 pt-3 border-t border-gray-100 mt-auto">
                        <span className="font-bold text-[#3b4890] truncate max-w-[50%]">{post.author}</span>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-red-500 font-bold flex items-center gap-1">
                            👀 {post.views || 0}
                          </span>
                          <span>{formatDate(post.date)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* 기존 페이지 나누기와 검색창은 100% 그대로 보존! (약간 예쁘게만 다듬었습니다) */}
          <div className="flex justify-center items-center gap-2 mt-12 border-t pt-8">
            {page > 1 && (
              <Link href={`/board?page=${page - 1}${keyword ? `&q=${keyword}` : ''}${bestCount > 0 ? `&best=${bestCount}` : ''}`} className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 font-bold text-sm shadow-sm">
                &lt; 이전
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link key={p} href={`/board?page=${p}${keyword ? `&q=${keyword}` : ''}${bestCount > 0 ? `&best=${bestCount}` : ''}`} className={`px-4 py-2 border rounded-lg font-bold text-sm transition-colors shadow-sm ${page === p ? 'bg-[#3b4890] text-white border-[#3b4890]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link href={`/board?page=${page + 1}${keyword ? `&q=${keyword}` : ''}${bestCount > 0 ? `&best=${bestCount}` : ''}`} className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 font-bold text-sm shadow-sm">
                다음 &gt;
              </Link>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <form action="/board" method="GET" className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {bestCount > 0 && <input type="hidden" name="best" value={bestCount} />}
              <select className="p-3 border border-gray-300 rounded-lg focus:outline-[#3b4890] text-sm text-gray-600 font-bold bg-white outline-none cursor-pointer shadow-sm">
                <option value="all">제목 + 글쓴이</option>
              </select>
              <input name="q" defaultValue={keyword} placeholder="검색어를 입력하세요" className="p-3 border border-gray-300 rounded-lg w-full md:w-72 focus:outline-[#3b4890] text-sm outline-none shadow-sm font-medium" required />
              <button type="submit" className="px-8 py-3 bg-[#3b4890] text-white rounded-lg font-black hover:bg-[#222b5c] transition-colors text-sm shadow-md w-full md:w-auto">
                🔍 검색
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}