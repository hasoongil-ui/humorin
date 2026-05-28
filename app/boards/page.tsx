// 파일 위치: app/boards/page.tsx
import { sql } from '@vercel/postgres';
import Link from 'next/link';
import CategoryIcon from '../board/CategoryIcon';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '전체 게시판 | 유머인',
  description: '유머인의 모든 게시판을 한눈에 확인하고 바로 이동하세요.',
};

export default async function AllBoardsPage() {
  let boards: any[] = [];
  try {
    const { rows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    boards = rows;
  } catch (e) { console.error(e); }

  const groupsMap: Record<string, any[]> = {};
  
  // 💡 [핵심 추가] 명예의 전당 그룹에 '명작 쇼케이스'를 누락 없이 완벽 추가!
  groupsMap['🏆 명예의 전당'] = [
    { name: '🔥 투데이 베스트', link: '/board?best=today' },
    { name: '🏛️ 명작 쇼케이스', link: '/board?best=showcase' },
    { name: '💯 백베스트', link: '/board?best=100' },
    { name: '👑 천베스트', link: '/board?best=1000' }
  ];

  boards.forEach(b => {
    const groupName = b.group_name || '미분류 게시판';
    if (!groupsMap[groupName]) groupsMap[groupName] = [];
    groupsMap[groupName].push({ name: b.name, link: `/board?category=${b.name}` });
  });

  return (
    <div className="min-h-screen bg-[#f4f5f7] py-8 px-4 font-sans">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#414a66] pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-[#3b4890]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              전체 게시판
            </h1>
            <p className="text-sm md:text-base text-gray-500 font-bold mt-2">
              유머인의 모든 게시판을 한눈에 확인하고 바로 이동하세요.
            </p>
          </div>
          <Link href="/" className="inline-flex items-center justify-center px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-[13px] md:text-sm font-bold rounded-sm hover:bg-gray-50 transition-colors shadow-sm shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            메인으로 돌아가기
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.keys(groupsMap).map((groupName) => {
            const list = groupsMap[groupName];
            // 💡 10칸 고정용 빈칸 데이터 생성
            const emptySlots = Array(Math.max(0, 10 - list.length)).fill(null);

            return (
              <div key={groupName} className="bg-white rounded-sm shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-[#414a66] px-4 py-3 border-b border-[#2a3042]">
                  <h2 className="text-[15px] font-black text-white flex items-center tracking-wide">{groupName}</h2>
                </div>
                
                <ul className="divide-y divide-gray-100 flex-1 p-2">
                  {list.map((board, idx) => (
                    <li key={idx} className="flex items-center">
                      <Link href={board.link} className="flex items-center px-3 py-3 w-full hover:bg-indigo-50/70 transition-colors rounded-sm group">
                        <CategoryIcon category={board.name} />
                        <span className="text-[14px] font-bold text-gray-700 ml-1 group-hover:text-[#3b4890]">{board.name}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-[#3b4890] opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                  
                  {/* 💡 모바일에서는 숨기고, PC에서만 투명하게 10칸 높이 유지 */}
                  {emptySlots.map((_, idx) => (
                    <li key={`empty-${idx}`} className="hidden md:flex items-center px-3 py-3 w-full h-[46px] opacity-0 pointer-events-none">
                      빈칸
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}