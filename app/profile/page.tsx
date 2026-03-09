import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@vercel/postgres';
import Link from 'next/link';
import Navbar from '../board/Navbar';
import SettingsClient from './SettingsClient';
import { logoutAction } from './actions';

function formatDate(dateValue: any) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
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
  const currentTab = searchParams.tab || 'posts';

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  if (!currentUser) {
    redirect('/login');
  }

  const client = await db.connect();
  let myPosts: any[] = [];
  let myScraps: any[] = []; 
  
  try {
    const postsResult = await client.sql`SELECT * FROM posts WHERE author = ${currentUser} ORDER BY id DESC LIMIT 100`;
    myPosts = postsResult.rows;

    const scrapsResult = await client.sql`SELECT p.* FROM posts p JOIN scraps s ON p.id = s.post_id WHERE s.author = ${currentUser} ORDER BY s.created_at DESC LIMIT 100`;
    myScraps = scrapsResult.rows;
  } catch (error: any) {
    console.error("데이터 불러오기 실패:", error);
  } finally {
    client.release();
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] font-sans text-gray-800 pb-20">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
        
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-6 text-center sticky top-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4 border border-gray-200">
              <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-gray-900">{currentUser} 님</h2>
            <p className="text-sm text-gray-500 mt-1 font-medium">커뮤니티 오재미</p>
            
            <div className="mt-6 flex justify-around border-t border-gray-100 pt-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold mb-1">작성글</p>
                <p className="text-lg font-black text-[#3b4890]">{myPosts.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold mb-1">스크랩</p>
                <p className="text-lg font-black text-[#e74c3c]">{myScraps.length}</p>
              </div>
            </div>
            
            <Link href="/profile?tab=settings">
              <button className="w-full mt-6 py-2 bg-gray-50 text-gray-600 border border-gray-200 font-bold rounded-sm hover:bg-gray-100 transition-colors text-sm mb-2">
                ⚙️ 회원정보 수정
              </button>
            </Link>
            
            <form action={logoutAction}>
              <button type="submit" className="w-full py-2 bg-gray-800 text-white font-bold rounded-sm hover:bg-gray-900 transition-colors text-sm">
                로그아웃
              </button>
            </form>
          </div>
        </div>

        <div className="flex-1 bg-white border border-gray-200 shadow-sm rounded-sm">
          
          <div className="flex border-b border-gray-200">
            <Link href="/profile?tab=posts" className={`flex-1 py-4 text-center font-bold text-sm md:text-base ${currentTab === 'posts' ? 'border-b-2 border-[#3b4890] text-[#3b4890] bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>
              내가 쓴 글 (최근 100개)
            </Link>
            <Link href="/profile?tab=scraps" className={`flex-1 py-4 text-center font-bold text-sm md:text-base ${currentTab === 'scraps' ? 'border-b-2 border-[#3b4890] text-[#3b4890] bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>
              스크랩한 글
            </Link>
            <Link href="/profile?tab=settings" className={`flex-1 py-4 text-center font-bold text-sm md:text-base ${currentTab === 'settings' ? 'border-b-2 border-[#3b4890] text-[#3b4890] bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>
              정보 수정
            </Link>
          </div>

          <div className="p-0">
            {currentTab === 'posts' && (
              <div>
                {myPosts.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {myPosts.map((post) => {
                      const postDate = post.created_at || post.createdAt || post.date || post.reg_date || '';
                      return (
                        <li key={post.id} className="hover:bg-gray-50 transition-colors">
                          <Link href={`/board/${post.id}`} className="block py-3 px-4 md:py-3.5 md:px-5">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-[15px] text-gray-800 hover:underline">{post.title}</span>
                              <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-4">{formatDate(postDate)}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="py-20 text-center text-gray-400 font-bold">
                    <p>아직 작성한 글이 없습니다.</p>
                    <Link href="/board/write"><button className="mt-4 px-6 py-2 bg-[#3b4890] text-white rounded-sm hover:bg-[#2a3042] transition-colors">첫 글 쓰러 가기</button></Link>
                  </div>
                )}
              </div>
            )}

            {currentTab === 'scraps' && (
              <div>
                {myScraps.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {myScraps.map((post) => {
                      const postDate = post.created_at || post.createdAt || post.date || post.reg_date || '';
                      return (
                        <li key={`scrap-${post.id}`} className="hover:bg-gray-50 transition-colors">
                          <Link href={`/board/${post.id}`} className="block py-3 px-4 md:py-3.5 md:px-5">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-[15px] text-gray-800 hover:underline">{post.title}</span>
                              <div className="flex items-center gap-3 ml-4">
                                <span className="text-xs text-gray-500 font-bold">{post.author}</span>
                                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{formatDate(postDate)}</span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="py-20 text-center text-gray-400 font-bold">
                    <p>아직 스크랩한 글이 없습니다.</p>
                    <Link href="/board"><button className="mt-4 px-6 py-2 bg-gray-100 text-gray-600 rounded-sm border border-gray-300 hover:bg-gray-200 transition-colors">게시판 둘러보기</button></Link>
                  </div>
                )}
              </div>
            )}

            {currentTab === 'settings' && (
              <SettingsClient currentUser={currentUser} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}