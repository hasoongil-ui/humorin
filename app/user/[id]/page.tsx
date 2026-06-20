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
  const searchParams = await props.searchParams;
  
  // 💡 URL 이동용 원본 ID와 검색용 한글 디코딩 ID 완벽 분리
  const rawUrlId = params.id || ''; 
  const targetParam = decodeURIComponent(rawUrlId); 
  
  const currentPage = Number(searchParams?.page) || 1;
  const itemsPerPage = 20;
  const offset = (currentPage - 1) * itemsPerPage;

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

  // 💡 VVIP 헌액 횟수 조회 (초경량)
  const { rows: vipRows } = await sql`
    SELECT COUNT(*) as count FROM weekly_vips WHERE user_id = ${targetUserId}
  `;
  const vvipWinCount = parseInt(vipRows[0].count, 10) || 0;

  const { rows: countRows } = await sql`
    SELECT COUNT(*) 
    FROM posts 
    WHERE author_id = ${targetUserId} OR author = ${user.nickname}
  `;

  const totalItems = parseInt(countRows[0].count, 10) || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const { rows: userPosts } = await sql`
    SELECT id, title, views, likes, date 
    FROM posts 
    WHERE author_id = ${targetUserId} OR author = ${user.nickname}
    ORDER BY id DESC 
    LIMIT ${itemsPerPage} OFFSET ${offset}
  `;

  // 💡 [초심플 마스터 페이징 엔진] 5개씩 블록 단위 점프 + 처음 버튼 장착
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const blockSize = 5;
    const currentBlock = Math.ceil(currentPage / blockSize);
    const startPage = (currentBlock - 1) * blockSize + 1;
    const endPage = Math.min(startPage + blockSize - 1, totalPages);
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex justify-center items-center gap-1 mt-8 mb-4 flex-wrap">
        {/* [처음] 버튼 - 항상 1페이지로 */}
        {currentPage > 1 && (
          <Link href={`/user/${rawUrlId}?page=1`} className="px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-[12px] font-bold rounded-sm hover:bg-gray-50 transition-colors">
            처음
          </Link>
        )}
        
        {/* [이전] 버튼 - 이전 블록으로 점프 (예: 6페이지에서 누르면 5페이지로) */}
        {startPage > 1 && (
          <Link href={`/user/${rawUrlId}?page=${startPage - 1}`} className="px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-[12px] font-bold rounded-sm hover:bg-gray-50 transition-colors">
            이전
          </Link>
        )}
        
        {/* 번호 버튼 5개 */}
        {pages.map(page => (
          <Link key={page} href={`/user/${rawUrlId}?page=${page}`} className={`px-3 py-1.5 border text-[12px] font-bold rounded-sm transition-colors ${page === currentPage ? 'bg-[#414a66] text-white border-[#414a66]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
            {page}
          </Link>
        ))}
        
        {/* [다음] 버튼 - 다음 블록으로 점프 (예: 5페이지에서 누르면 6페이지로) */}
        {endPage < totalPages && (
          <Link href={`/user/${rawUrlId}?page=${endPage + 1}`} className="px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-[12px] font-bold rounded-sm hover:bg-gray-50 transition-colors">
            다음
          </Link>
        )}
      </div>
    );
  };

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
          
          <div className="w-24 h-24 bg-gray-50 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-black shadow-sm border border-gray-200 text-[#3b4890] overflow-hidden">
            {user.profile_image ?
            (
              <img src={user.profile_image} alt={`${user.nickname} 프로필`} className="w-full h-full object-cover" />
            ) : (
              user.nickname.charAt(0)
            )}
          </div>
          
          <h2 className="text-3xl font-black mb-3 text-gray-800">{user.nickname}</h2>
          
          {/* 💡 VVIP 화이트 모드 입체 황금 훈장 (1회 이상 헌액자 전용) */}
          {vvipWinCount > 0 && (
            <div className="mb-5 flex justify-center">
              <div className="bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 border-2 border-yellow-400/80 text-amber-900 text-[14px] font-black px-5 py-2 rounded-full flex items-center gap-2 shadow-[0_4px_6px_-1px_rgba(217,119,6,0.2),0_2px_4px_-1px_rgba(217,119,6,0.1),inset_0_2px_0_rgba(255,255,255,0.6)] transform hover:scale-105 transition-all">
                <span className="text-xl drop-shadow-sm filter brightness-110">👑</span> 
                유머인 VVIP 
                <span className="bg-red-600 text-white px-2 py-0.5 rounded-md font-black ml-0.5 text-[14px] shadow-sm">{vvipWinCount}회</span> 
                <span className="text-amber-800">헌액</span>
              </div>
            </div>
          )}

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
            작성한 게시글 <span className="text-[#3b4890]">{totalItems}</span> 
          </h3>
         
          {userPosts.length === 0 ?
          (
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
          
          {/* 💡 렌더링된 하단 번호 버튼을 화면에 출력 */}
          {renderPagination()}

        </div>

      </div>
    </div>
  );
}