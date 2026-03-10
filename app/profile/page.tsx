import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { updateProfileAction } from './actions';

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`; 
  } catch (e) {
    return '';
  }
}

export default async function ProfilePage(props: any) {
  const searchParams = await props.searchParams;
  const currentTab = searchParams?.tab || 'posts';

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');      
  const userIdCookie = cookieStore.get('ojemi_userid');  
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  if (!currentUser) {
    redirect('/login');
  }

  let myPosts: any[] = [];
  let myScraps: any[] = [];

  if (currentTab === 'posts' || currentTab === 'scraps') {
    try {
      const postsResult = await sql`SELECT * FROM posts WHERE author = ${currentUser} ORDER BY id DESC LIMIT 100`;
      myPosts = postsResult.rows;

      try {
        const scrapsResult = await sql`
          SELECT p.* FROM posts p
          JOIN scraps s ON p.id = s.post_id
          WHERE s.author = ${currentUser}
          ORDER BY s.created_at DESC LIMIT 100
        `;
        myScraps = scrapsResult.rows;
      } catch (e) {
        console.error("스크랩 조회 중 에러:", e);
      }
    } catch (error) {
      console.error("프로필 DB 조회 에러:", error);
    }
  }

  return (
    <div className="min-h-[80vh] bg-gray-50 flex justify-center py-10 px-4 font-sans">
      <div className="w-full max-w-[800px] bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="bg-[#2a3042] p-8 text-white text-center relative">
          {currentUserId === 'admin' && (
            <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-sm shadow-md">
              👑 최고 관리자 계정
            </div>
          )}
          <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black shadow-inner">
            {currentUser.charAt(0)}
          </div>
          <h2 className="text-2xl font-black mb-1">{currentUser}</h2>
          <p className="text-gray-300 text-sm font-medium">오재미의 소중한 이웃</p>
        </div>

        <div className="flex border-b border-gray-200 bg-white">
          <Link href="/profile?tab=posts" className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${currentTab === 'posts' ? 'text-[#3b4890] border-b-2 border-[#3b4890] bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>내가 쓴 글</Link>
          <Link href="/profile?tab=scraps" className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${currentTab === 'scraps' ? 'text-[#3b4890] border-b-2 border-[#3b4890] bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>스크랩 북</Link>
          <Link href="/profile?tab=settings" className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${currentTab === 'settings' ? 'text-[#3b4890] border-b-2 border-[#3b4890] bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>정보 수정</Link>
        </div>

        <div className="p-6 md:p-8">
          
          {currentTab === 'posts' && (
            <div>
              {myPosts.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-bold text-sm">아직 작성하신 글이 없습니다.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myPosts.map((post: any) => (
                    <div key={post.id} className="py-4 hover:bg-gray-50 transition-colors px-2 rounded-sm flex justify-between items-center gap-4">
                      <Link href={`/board/${post.id}`} className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold text-gray-800 truncate mb-1">{post.title}</div>
                        <div className="text-xs text-gray-400 font-medium">{formatDate(post.date)} · 조회 {post.views || 0} · 공감 {post.likes || 0}</div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentTab === 'scraps' && (
            <div>
              {myScraps.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-bold text-sm">스크랩한 글이 없습니다.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myScraps.map((post: any) => (
                    <div key={post.id} className="py-4 hover:bg-gray-50 transition-colors px-2 rounded-sm flex justify-between items-center gap-4">
                      <Link href={`/board/${post.id}`} className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold text-gray-800 truncate mb-1">{post.title}</div>
                        <div className="text-xs text-gray-400 font-medium">{post.author} · {formatDate(post.date)}</div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentTab === 'settings' && (
            <div className="max-w-[400px] mx-auto py-4">
              <form action={updateProfileAction} className="space-y-6">
                <input type="hidden" name="currentUserId" value={currentUserId || ''} />
                <input type="hidden" name="currentNickname" value={currentUser || ''} />

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">새 닉네임</label>
                  <input name="newNickname" placeholder="변경할 닉네임 입력 (선택)" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호</label>
                  <input type="password" name="newPassword" placeholder="변경할 비밀번호 입력 (선택)" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#2a3042] text-white rounded-sm font-bold text-[15px] hover:bg-[#1e2335] shadow-sm transition-colors mt-4">
                  정보 수정하기
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}