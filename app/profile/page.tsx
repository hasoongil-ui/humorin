// @ts-nocheck
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import SettingsForm from './SettingsForm';
import ProfileAvatar from './ProfileAvatar';

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

const TIER_SYSTEM = [
  { name: '씨앗', min: 0, icon: '🌱', color: 'text-green-300' },
  { name: '새싹', min: 100, icon: '🌿', color: 'text-emerald-400' },
  { name: '잎새', min: 500, icon: '🍃', color: 'text-teal-400' },
  { name: '꽃', min: 2000, icon: '🌸', color: 'text-pink-400' },
  { name: '열매', min: 10000, icon: '🍎', color: 'text-red-400' },
  { name: '나무', min: 50000, icon: '🌳', color: 'text-amber-600' },
  { name: '숲의 전설', min: 200000, icon: '🏞️', color: 'text-yellow-400' }
];

function getTierInfo(points: number) {
  let current = TIER_SYSTEM[0];
  let next = TIER_SYSTEM[1];
  for (let i = TIER_SYSTEM.length - 1; i >= 0; i--) {
    if (points >= TIER_SYSTEM[i].min) {
      current = TIER_SYSTEM[i];
      next = TIER_SYSTEM[i + 1] || current; 
      break;
    }
  }
  return { current, next };
}

export default async function ProfilePage(props: any) {
  const searchParams = await props.searchParams;
  const currentTab = searchParams?.tab || 'posts';
  
  // 💡 [페이지 나누기 핵심 1] 현재 페이지 번호와 1페이지당 개수(30개) 설정!
  const currentPage = parseInt(searchParams?.page || '1', 10) || 1;
  const ITEMS_PER_PAGE = 30;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('humorin_user');      
  const userIdCookie = cookieStore.get('humorin_userid');  
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  if (!currentUser) {
    redirect('/login');
  }

  let points = 0;
  let profileImage = null; 
  let currentEmail = ''; 
  let myPosts: any[] = [];
  let myScraps: any[] = [];
  let totalItems = 0; 

  try {
    if (currentUserId) {
      const userRes = await sql`SELECT email, points, profile_image FROM users WHERE user_id = ${currentUserId}`;
      if (userRes.rows.length > 0) {
        currentEmail = userRes.rows[0].email;
        points = userRes.rows[0].points || 0;
        profileImage = userRes.rows[0].profile_image;
      }
    }

    // 💡 [페이지 나누기 핵심 2] 탭에 맞춰서 전체 개수를 세고, 딱 30개만 잘라서 가져오기!
    if (currentTab === 'posts') {
      const countRes = await sql`SELECT COUNT(*) FROM posts WHERE author = ${currentUser}`;
      totalItems = parseInt(countRes.rows[0].count, 10);

      const postsResult = await sql`SELECT * FROM posts WHERE author = ${currentUser} ORDER BY id DESC LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`;
      myPosts = postsResult.rows;

    } else if (currentTab === 'scraps') {
      const countRes = await sql`SELECT COUNT(*) FROM scraps WHERE author = ${currentUser}`;
      totalItems = parseInt(countRes.rows[0].count, 10);

      try {
        const scrapsResult = await sql`
          SELECT p.* FROM posts p JOIN scraps s ON p.id = s.post_id
          WHERE s.author = ${currentUser} ORDER BY s.created_at DESC LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
        `;
        myScraps = scrapsResult.rows;
      } catch (e) {
        console.error("스크랩 조회 중 에러:", e);
      }
    }
  } catch (error) {
    console.error("프로필 DB 조회 에러:", error);
  }

  async function updateProfileImage(url: string) {
    'use server';
    const store = await cookies();
    const uid = store.get('humorin_userid')?.value;
    if (!uid) return { error: 'Unauthorized' };

    try {
      await sql`UPDATE users SET profile_image = ${url} WHERE user_id = ${uid}`;
      revalidatePath('/profile'); 
      return { success: true };
    } catch (error) {
      return { error: 'DB Error' };
    }
  }

  const { current: currentTier, next: nextTier } = getTierInfo(points);
  const isMaxLevel = currentTier.name === nextTier.name;
  
  const progressPercent = isMaxLevel 
    ? 100 
    : Math.min(((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100);

  // 💡 [페이지 나누기 핵심 3] 전체 페이지 수 계산 및 완벽 반응형 렌더링 함수
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  
  const renderPagination = () => {
    if (totalPages <= 1) return null; // 1페이지밖에 없으면 번호 숨기기

    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    const visiblePages = [];
    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }

    const getPageUrl = (pageNum: number) => `/profile?tab=${currentTab}&page=${pageNum}`;

    return (
      <div className="flex justify-center items-center gap-1 flex-wrap mt-8 pb-4 w-full">
        {currentPage > 1 && (
          <>
            <Link href={getPageUrl(1)} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
              <span className="hidden sm:inline">처음</span>
              <span className="sm:hidden">{"<<"}</span>
            </Link>
            <Link href={getPageUrl(currentPage - 1)} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
              <span className="hidden sm:inline">이전</span>
              <span className="sm:hidden">{"<"}</span>
            </Link>
          </>
        )}
        
        {visiblePages.map((p) => (
          <Link 
            key={p} 
            href={getPageUrl(p)} 
            className={`px-2.5 sm:px-3 py-1.5 border rounded-sm font-bold text-[12px] transition-colors shrink-0 ${currentPage === p ? 'bg-[#3b4890] text-white border-[#3b4890]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
          >
            {p}
          </Link>
        ))}
        
        {currentPage < totalPages && (
          <>
            <Link href={getPageUrl(currentPage + 1)} className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 font-bold text-[12px] shrink-0 whitespace-nowrap">
              <span className="hidden sm:inline">다음</span>
              <span className="sm:hidden">{">"}</span>
            </Link>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[80vh] bg-gray-50 flex justify-center py-10 px-4 font-sans">
      <div className="w-full max-w-[800px] bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="bg-[#2a3042] p-6 md:p-8 text-white text-center relative overflow-hidden">
          {currentUserId === 'admin' && (
            <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-sm shadow-md z-10">
              👑 최고 관리자
            </div>
          )}
          
          <div className="relative z-10">
            <ProfileAvatar 
              initialImage={profileImage} 
              fallbackChar={currentUser.charAt(0)} 
              updateAction={updateProfileImage} 
            />

            <h2 className="text-2xl font-black mb-1">{currentUser}</h2>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 ${currentTier.color} font-bold text-sm rounded-full mb-6 border border-white/10`}>
              <span>{currentTier.icon}</span> {currentTier.name} 등급
            </div>

            <div className="max-w-[400px] mx-auto bg-black/30 p-4 rounded-md border border-white/10 backdrop-blur-sm mb-4">
              <div className="flex justify-between text-[13px] font-bold text-gray-300 mb-2">
                <span>내 포인트: <span className="text-rose-400">{points.toLocaleString()} P</span></span>
                {!isMaxLevel ? (
                  <span>다음 단계 <span className="text-white">[{nextTier.icon} {nextTier.name}]</span> 까지: {(nextTier.min - points).toLocaleString()} P 남음</span>
                ) : (
                  <span className="text-yellow-400">✨ 유머인의 전설 달성! ✨</span>
                )}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner relative">
                <div className="bg-gradient-to-r from-rose-500 to-yellow-400 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            <div className="max-w-[500px] mx-auto bg-white/5 rounded-sm p-3 border border-white/10">
              <div className="flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-xs font-bold text-gray-400 mb-3 overflow-x-auto whitespace-nowrap pb-1">
                {TIER_SYSTEM.map((tier, idx) => (
                  <div key={tier.name} className="flex items-center gap-1 md:gap-2">
                    <div className={`flex flex-col items-center ${currentTier.name === tier.name ? 'text-white scale-110 drop-shadow-md' : 'opacity-60'}`}>
                      <span className="text-lg md:text-xl">{tier.icon}</span>
                      <span className="mt-0.5">{tier.name}</span>
                    </div>
                    {idx < TIER_SYSTEM.length - 1 && <span className="text-gray-600">➔</span>}
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-2 text-[11px] md:text-xs text-gray-300 font-medium flex justify-center gap-4">
                <span>📝 글 작성 <span className="text-yellow-400 font-bold">+10P</span></span>
                <span>💬 댓글 작성 <span className="text-yellow-400 font-bold">+5P</span></span>
                <span>💖 내 글 추천받음 <span className="text-yellow-400 font-bold">+2P</span></span>
              </div>
            </div>

          </div>
          
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
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
                <>
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
                  {/* 💡 [페이지 나누기 버튼 장착!] */}
                  {renderPagination()}
                </>
              )}
            </div>
          )}

          {currentTab === 'scraps' && (
            <div>
              {myScraps.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-bold text-sm">스크랩한 글이 없습니다.</div>
              ) : (
                <>
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
                  {/* 💡 [페이지 나누기 버튼 장착!] */}
                  {renderPagination()}
                </>
              )}
            </div>
          )}

          {currentTab === 'settings' && (
            <div className="max-w-[400px] mx-auto py-4">
              <SettingsForm 
                currentUserId={currentUserId!} 
                currentNickname={currentUser} 
                isNaverUser={currentUserId?.startsWith('n_')} 
                currentEmail={currentEmail} 
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}