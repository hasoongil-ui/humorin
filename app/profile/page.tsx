// @ts-nocheck
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache'; // 💡 [추가] DB 업데이트 후 새로고침용
import Link from 'next/link';
import SettingsForm from './SettingsForm';
import ProfileAvatar from './ProfileAvatar'; // 💡 [추가] 방금 만든 프사 업로드 부품 장착!

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

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');      
  const userIdCookie = cookieStore.get('ojemi_userid');  
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  if (!currentUser) {
    redirect('/login');
  }

  let points = 0;
  let profileImage = null; // 💡 [추가] DB에서 가져올 프사 주소 보관함
  let myPosts: any[] = [];
  let myScraps: any[] = [];

  try {
    if (currentUserId) {
      // 💡 [수술] points 뿐만 아니라 profile_image도 같이 가져오게 쿼리 변경!
      const userRes = await sql`SELECT points, profile_image FROM users WHERE user_id = ${currentUserId}`;
      if (userRes.rows.length > 0) {
        points = userRes.rows[0].points || 0;
        profileImage = userRes.rows[0].profile_image;
      }
    }

    if (currentTab === 'posts' || currentTab === 'scraps') {
      const postsResult = await sql`SELECT * FROM posts WHERE author = ${currentUser} ORDER BY id DESC LIMIT 100`;
      myPosts = postsResult.rows;

      try {
        const scrapsResult = await sql`
          SELECT p.* FROM posts p JOIN scraps s ON p.id = s.post_id
          WHERE s.author = ${currentUser} ORDER BY s.created_at DESC LIMIT 100
        `;
        myScraps = scrapsResult.rows;
      } catch (e) {
        console.error("스크랩 조회 중 에러:", e);
      }
    }
  } catch (error) {
    console.error("프로필 DB 조회 에러:", error);
  }

  // 💡 [서버 액션] 업로드 성공 후 받은 사진 주소를 DB에 저장하는 1급 보안 로직
  async function updateProfileImage(url: string) {
    'use server';
    const store = await cookies();
    const uid = store.get('ojemi_userid')?.value;
    if (!uid) return { error: 'Unauthorized' };

    try {
      await sql`UPDATE users SET profile_image = ${url} WHERE user_id = ${uid}`;
      revalidatePath('/profile'); // 업데이트 완료 후 화면 즉시 새로고침
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
            {/* 💡 [수술 핵심] 밋밋했던 글자 프사를 떼어내고, 카메라 달린 스마트 프사 부품으로 교체! */}
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
                  <span className="text-yellow-400">✨ 오재미의 전설 달성! ✨</span>
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
              <SettingsForm currentUserId={currentUserId!} currentNickname={currentUser} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}