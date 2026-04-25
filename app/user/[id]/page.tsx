// @ts-nocheck
import { sql } from '@vercel/postgres';
import Link from 'next/link';

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
  { name: '씨앗', min: 0, icon: '🌱', color: 'text-green-500' },
  { name: '새싹', min: 100, icon: '🌿', color: 'text-emerald-500' },
  { name: '잎새', min: 500, icon: '🍃', color: 'text-teal-500' },
  { name: '꽃', min: 2000, icon: '🌸', color: 'text-pink-500' },
  { name: '열매', min: 10000, icon: '🍎', color: 'text-red-500' },
  { name: '나무', min: 50000, icon: '🌳', color: 'text-amber-600' },
  { name: '숲의 전설', min: 200000, icon: '🏞️', color: 'text-yellow-500' }
];

function getTierInfo(points: number) {
  let current = TIER_SYSTEM[0];
  for (let i = TIER_SYSTEM.length - 1; i >= 0; i--) {
    if (points >= TIER_SYSTEM[i].min) {
      current = TIER_SYSTEM[i];
      break;
    }
  }
  return current;
}

export default async function PublicProfilePage(props: any) {
  const params = await props.params;
  const targetParam = decodeURIComponent(params.id || ''); 

  // 💡 [수술 핵심 1] profile_image 데이터도 DB에서 같이 불러옵니다!
  const { rows: userRows } = await sql`
    SELECT user_id, nickname, points, profile_image 
    FROM users 
    WHERE user_id = ${targetParam} OR nickname = ${targetParam}
  `;
  
  if (userRows.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center font-sans">
        <div className="text-center font-bold text-gray-500 text-xl mb-6">존재하지 않거나 탈퇴한 유저입니다.</div>
        <Link href="/" className="px-6 py-2 bg-[#3b4890] text-white font-bold rounded-sm shadow-sm hover:bg-[#2a3042] transition-colors">
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  const user = userRows[0];
  const targetUserId = user.user_id; 
  const points = user.points || 0;
  const tier = getTierInfo(points);

  const { rows: userPosts } = await sql`
    SELECT id, title, views, likes, date 
    FROM posts 
    WHERE author_id = ${targetUserId} OR author = ${user.nickname}
    ORDER BY id DESC LIMIT 50
  `;

  return (
    <div className="min-h-[80vh] bg-gray-50 flex flex-col items-center py-10 px-4 font-sans">
      
      <div className="w-full max-w-[800px] mb-4 flex justify-start">
        <Link href="/" className="inline-flex items-center text-gray-700 hover:text-[#3b4890] font-bold text-[15px] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 mr-1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          유머인 메인으로 돌아가기
        </Link>
      </div>

      <div className="w-full max-w-[800px] bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="bg-white p-10 border-b border-gray-100 text-center relative">
          
          {/* 💡 [수술 핵심 2] 프사가 있으면 사진을 띄우고, 없으면 기존처럼 글자(닉네임 첫 글자)를 띄웁니다. */}
          <div className="w-24 h-24 bg-gray-50 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-black shadow-sm border border-gray-200 text-[#3b4890] overflow-hidden">
            {user.profile_image ? (
              <img src={user.profile_image} alt={`${user.nickname} 프로필`} className="w-full h-full object-cover" />
            ) : (
              user.nickname.charAt(0)
            )}
          </div>
          
          <h2 className="text-3xl font-black mb-3 text-gray-800">{user.nickname}</h2>
          
          <div className="flex justify-center items-center gap-3">
            <div className={`px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-bold ${tier.color}`}>
              {tier.icon} {tier.name} 등급
            </div>
            <div className="px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-bold text-gray-600">
              <span className="text-rose-500 mr-1">P</span> {points.toLocaleString()} 점
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <h3 className="font-bold text-lg mb-4 text-gray-800 border-b-2 border-gray-800 pb-2 inline-block">
            작성한 게시글 <span className="text-[#3b4890]">{userPosts.length}</span>
          </h3>
          
          {userPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 font-bold text-sm">아직 작성한 글이 없습니다.</div>
          ) : (
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {userPosts.map((post: any) => (
                <div key={post.id} className="py-4 hover:bg-gray-50 transition-colors px-2 rounded-sm flex justify-between items-center gap-4">
                  <Link href={`/board/${post.id}`} className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-gray-800 truncate mb-1 hover:text-[#3b4890] transition-colors">{post.title}</div>
                    <div className="text-xs text-gray-400 font-medium">
                      {formatDate(post.date)} · 조회 {post.views || 0} · 공감 <span className="text-rose-400">{post.likes || 0}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}