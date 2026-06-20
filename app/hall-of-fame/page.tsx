import { sql } from '@vercel/postgres';
import Link from 'next/link';

export const revalidate = 3600; // 1시간마다 캐시 갱신 (트래픽 폭주해도 DB 부하 0%)

interface VIPRecord {
  id: number;
  year: number;
  month: number;
  week: number;
  user_id: string;
  awarded_nickname: string;
  awarded_profile_image: string | null;
  total_score: number;
}

export default async function HallOfFamePage() {
  // 1. DB에서 역대 VIP 기록을 모두 가져옴 (최신순 정렬)
  const { rows: vips } = await sql<VIPRecord>`
    SELECT * FROM weekly_vips 
    ORDER BY year DESC, month DESC, week DESC
  `;

  // 2. 연도별 > 월별로 데이터 그룹핑 (1년치 렌더링용)
  const groupedData: Record<number, Record<number, VIPRecord[]>> = {};
  vips.forEach(vip => {
    if (!groupedData[vip.year]) groupedData[vip.year] = {};
    if (!groupedData[vip.year][vip.month]) groupedData[vip.year][vip.month] = [];
    groupedData[vip.year][vip.month].push(vip);
  });

  // 현재 시간 (심사 대기중 카드 계산용)
  const kstNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  const currentYear = kstNow.getFullYear();
  const currentMonth = kstNow.getMonth() + 1;

  // 빈자리(심사 대기중)를 채우기 위해 해당 월의 총 주차(Week)를 구하는 함수
  const getWeeksInMonth = (year: number, month: number) => {
    const lastDay = new Date(year, month, 0).getDate();
    return Math.ceil(lastDay / 7);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-20">
      
      {/* 💡 럭셔리 다크 네이비 헤더 (시상식 분위기) */}
      <div className="bg-[#2a3042] pt-16 pb-12 px-4 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-[1000px] mx-auto text-center relative z-10">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
            유머인 <span className="text-yellow-400">명예의 전당</span>
          </h1>
          <p className="text-indigo-200 font-bold text-sm md:text-base">
            매주 유머인을 빛내주신 가장 감사한 이웃들의 영광스러운 기록입니다.
          </p>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 -mt-6 relative z-20">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8">
          
          {Object.keys(groupedData).length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold">
              <span className="text-4xl block mb-4">🏆</span>
              아직 선정된 VIP가 없습니다.<br/>첫 번째 명예의 전당 주인공이 되어보세요!
            </div>
          ) : (
            // 연도별 렌더링
            Object.keys(groupedData).sort((a, b) => Number(b) - Number(a)).map(year => (
              <div key={year} className="mb-16 last:mb-0">
                <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-800 pb-3">
                  <h2 className="text-3xl font-black text-gray-800">{year}년</h2>
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full border border-gray-200">
                    Yearly Records
                  </span>
                </div>

                {/* 월별 렌더링 */}
                {Object.keys(groupedData[Number(year)]).sort((a, b) => Number(b) - Number(a)).map(month => {
                  const vipsInMonth = groupedData[Number(year)][Number(month)];
                  const totalWeeks = getWeeksInMonth(Number(year), Number(month));
                  
                  // 해당 월의 주차별로 카드 생성 (1주차부터 4~5주차까지)
                  const weekCards = [];
                  for (let w = 1; w <= totalWeeks; w++) {
                    const vip = vipsInMonth.find(v => v.week === w);
                    
                    if (vip) {
                      // 수상자가 있는 경우 (영광의 카드)
                      weekCards.push(
                        <Link href={`/user/${vip.user_id}`} key={`vip-${vip.id}`} className="block group">
                          <div className="bg-white rounded-xl border border-yellow-300 shadow-[0_4px_12px_rgba(250,204,21,0.15)] p-5 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_20px_rgba(250,204,21,0.3)] relative overflow-hidden h-full flex flex-col justify-between">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                            
                            <div className="text-[12px] font-black text-orange-600 mb-4">{month}월 {w}주차 VIP</div>
                            
                            <div className="w-20 h-20 mx-auto rounded-full p-1 border-2 border-yellow-400 mb-3 relative bg-white shadow-sm">
                              {/* 💡 엑스박스 방어 폴백 (프사 없으면 회색 기본 이미지) */}
                              <img 
                                src={vip.awarded_profile_image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(vip.awarded_nickname) + "&background=F3F4F6&color=9CA3AF"} 
                                alt={vip.awarded_nickname}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(vip.awarded_nickname) + "&background=F3F4F6&color=9CA3AF" }}
                                loading="lazy"
                              />
                              <div className="absolute -bottom-2 -right-2 text-2xl drop-shadow-md">🥇</div>
                            </div>
                            
                            <div className="font-black text-[17px] text-gray-800 group-hover:text-[#3b4890] transition-colors truncate mb-3">
                              {vip.awarded_nickname}
                            </div>
                            
                            <div className="mt-auto pt-3 border-t border-gray-100">
                              <div className="text-[11px] font-bold text-gray-400">활동지수</div>
                              <div className="text-[14px] font-black text-orange-500">{vip.total_score.toLocaleString()} P</div>
                            </div>
                          </div>
                        </Link>
                      );
                    } else if (Number(year) === currentYear && Number(month) === currentMonth) {
                      // 아직 미래라서 심사를 안 한 경우 (심사 대기중 카드)
                      weekCards.push(
                        <div key={`pending-${month}-${w}`} className="bg-gray-50 rounded-xl border border-gray-200 border-dashed p-5 text-center flex flex-col items-center justify-center h-full min-h-[220px]">
                          <span className="text-3xl grayscale opacity-40 mb-2">🏆</span>
                          <div className="text-[13px] font-bold text-gray-400">{month}월 {w}주차</div>
                          <div className="text-[12px] font-medium text-gray-400 mt-1">심사 대기중</div>
                        </div>
                      );
                    }
                  }

                  return (
                    <div key={`${year}-${month}`} className="mb-10">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="bg-yellow-50 text-yellow-700 font-black text-sm px-3 py-1 rounded-sm border border-yellow-200">
                          {month}월
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {weekCards}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}