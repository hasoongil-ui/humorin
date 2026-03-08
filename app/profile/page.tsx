import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@vercel/postgres';
import Link from 'next/link';

// 💡 날짜를 예쁘게 포맷팅해주는 함수
function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  // 1. 💡 미나의 철통 보안: 로그인한 사람(쿠키)인지 확인합니다!
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  // 비로그인 상태면 로그인 페이지로 가차 없이 튕겨냅니다.
  if (!currentUser) {
    redirect('/login');
  }

  // 현재 선택된 탭 (기본값: 'posts')
  const currentTab = searchParams.tab || 'posts';

  // 2. 💡 DB에서 내가 쓴 글만 쏙쏙 뽑아오기!
  const client = await db.connect();
  let myPosts: any[] = [];
  
  try {
    // 주의: 테이블에 created_at, views 등의 컬럼이 있다고 가정합니다. (없으면 에러가 날 수 있으니 추후 확인!)
    const result = await client.sql`
      SELECT id, title, created_at
      FROM posts
      WHERE author = ${currentUser}
      ORDER BY id DESC
    `;
    myPosts = result.rows;
  } catch (error) {
    console.error("내가 쓴 글 불러오기 실패:", error);
  } finally {
    client.release();
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] font-sans text-gray-800 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
        
        {/* 왼쪽: 내 정보 요약 카드 */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4 border border-gray-200">
              <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-gray-900">{currentUser} 님</h2>
            <p className="text-sm text-gray-500 mt-1 font-medium">명품 커뮤니티 오재미</p>
            
            <div className="mt-6 flex justify-around border-t border-gray-100 pt-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold mb-1">작성글</p>
                <p className="text-lg font-black text-[#3b4890]">{myPosts.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold mb-1">스크랩</p>
                <p className="text-lg font-black text-[#e74c3c]">0</p>
              </div>
            </div>
            
            <Link href="/logout">
              <button className="w-full mt-6 py-2 bg-gray-800 text-white font-bold rounded-sm hover:bg-gray-900 transition-colors text-sm">
                로그아웃
              </button>
            </Link>
          </div>
        </div>

        {/* 오른쪽: 콘텐츠 영역 (탭 및 리스트) */}
        <div className="flex-1 bg-white border border-gray-200 shadow-sm rounded-sm">
          
          {/* 탭 네비게이션 */}
          <div className="flex border-b border-gray-200">
            <Link 
              href="/profile?tab=posts" 
              className={`flex-1 py-4 text-center font-bold text-sm md:text-base ${currentTab === 'posts' ? 'border-b-2 border-[#3b4890] text-[#3b4890]' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              내가 쓴 글
            </Link>
            <Link 
              href="/profile?tab=scraps" 
              className={`flex-1 py-4 text-center font-bold text-sm md:text-base ${currentTab === 'scraps' ? 'border-b-2 border-[#3b4890] text-[#3b4890]' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              스크랩한 글
            </Link>
          </div>

          {/* 탭 내용 */}
          <div className="p-0">
            {currentTab === 'posts' && (
              <div>
                {myPosts.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {myPosts.map((post) => (
                      <li key={post.id} className="hover:bg-gray-50 transition-colors">
                        <Link href={`/board/${post.id}`} className="block p-4 md:p-5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-800 hover:underline">{post.title}</span>
                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-4">
                              {formatDate(post.created_at)}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-20 text-center text-gray-400 font-bold">
                    <p>아직 작성한 글이 없습니다.</p>
                    <Link href="/board/write">
                      <button className="mt-4 px-6 py-2 bg-[#3b4890] text-white rounded-sm hover:bg-[#2a3042] transition-colors">
                        첫 글 쓰러 가기
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {currentTab === 'scraps' && (
              <div className="py-20 text-center text-gray-400 font-bold">
                <p>아직 스크랩 기능이 준비 중입니다!</p>
                <p className="text-sm mt-2 font-medium">조금만 기다려주세요 🚀</p>
              </div>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
}