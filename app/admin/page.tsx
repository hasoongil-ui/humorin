import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import KickButton from './KickButton';

export default async function AdminDashboardPage(props: any) {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('ojemi_userid');
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  // 1. 철벽 보안
  if (currentUserId !== 'admin') {
    redirect('/');
  }

  // 💡 미나의 신규 무기: 주소창의 검색어(파라미터)를 읽어옵니다!
  const searchParams = await props.searchParams;
  const searchType = searchParams?.searchType || 'nickname';
  const keyword = searchParams?.keyword || '';

  // 2. 상단용 전체 회원 통계 구하기 (검색과 무관하게 항상 전체 상태 표시)
  let totalUsers = 0;
  let adminCount = 0;
  let normalUsers = 0;
  try {
    const statResult = await sql`
      SELECT 
        COUNT(*) as total, 
        COALESCE(SUM(CASE WHEN is_admin = TRUE THEN 1 ELSE 0 END), 0) as admin_count 
      FROM users
    `;
    totalUsers = Number(statResult.rows[0].total);
    adminCount = Number(statResult.rows[0].admin_count);
    normalUsers = totalUsers - adminCount;
  } catch (error) {
    console.error('통계 조회 실패:', error);
  }

  // 3. 테이블용 회원 명단 조회 (검색어가 있으면 필터링해서 가져옴!)
  let users: any[] = [];
  try {
    if (keyword) {
      const searchKeyword = `%${keyword}%`; // 부분 일치 검색용 (예: '마라'만 쳐도 '마라톤' 검색)
      
      if (searchType === 'id') {
        const { rows } = await sql`SELECT id, user_id, nickname, is_admin FROM users WHERE user_id ILIKE ${searchKeyword} ORDER BY id DESC`;
        users = rows;
      } else {
        const { rows } = await sql`SELECT id, user_id, nickname, is_admin FROM users WHERE nickname ILIKE ${searchKeyword} ORDER BY id DESC`;
        users = rows;
      }
    } else {
      // 검색어가 없으면 최신 가입자 순으로 전체 가져오기 (성능을 위해 1000명 제한)
      const { rows } = await sql`SELECT id, user_id, nickname, is_admin FROM users ORDER BY id DESC LIMIT 1000`;
      users = rows;
    }
  } catch (error) {
    console.error('회원 목록 조회 실패:', error);
  }

  // 4. 무자비한 강제 탈퇴 엔진
  const kickUserAction = async (targetUserId: string) => {
    'use server';
    if (targetUserId === 'admin') return; 
    try {
      await sql`DELETE FROM users WHERE user_id = ${targetUserId}`;
      // 필요 시 작성 글/댓글 동시 삭제:
      // await sql`DELETE FROM posts WHERE author = ${targetUserId}`;
      // await sql`DELETE FROM comments WHERE author = ${targetUserId}`;
    } catch (error) {
      console.error('회원 삭제 중 에러:', error);
    }
    revalidatePath('/admin'); 
  };

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans">
      
      {/* 🟦 왼쪽 사이드바 */}
      <aside className="w-[240px] bg-[#2a3042] text-white hidden md:block shadow-xl z-10">
        <div className="p-6 border-b border-gray-700 text-center">
          <h1 className="text-3xl font-black text-white tracking-tighter">OJEMI</h1>
          <p className="text-rose-400 font-bold text-sm mt-1">최고 관리자 모드</p>
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          <div className="px-6 py-3 bg-[#3b4890] border-l-4 border-rose-500 font-bold text-[15px] cursor-default flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>
            사용자 관리
          </div>
          <Link href="/board" className="px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-medium text-[15px] flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.5 22.5a3 3 0 0 0 3-3v-8.174l-6.879 4.022 3.485 1.876a.75.75 0 0 1-.712 1.321l-5.683-3.06a1.5 1.5 0 0 0-1.422 0l-5.683 3.06a.75.75 0 0 1-.712-1.32l3.485-1.877L1.5 11.326V19.5a3 3 0 0 0 3 3h15Z" /><path d="M1.5 9.589v-.745a3 3 0 0 1 1.578-2.642l7.5-4.038a3 3 0 0 1 2.844 0l7.5 4.038A3 3 0 0 1 22.5 8.844v.745l-8.426 4.926-.652-.35a3 3 0 0 0-2.844 0l-.652.35L1.5 9.59Z" /></svg>
            게시판으로 돌아가기
          </Link>
          <div className="px-6 py-3 text-gray-500 font-medium text-[15px] cursor-not-allowed">게시물 관리 (준비중)</div>
          <div className="px-6 py-3 text-gray-500 font-medium text-[15px] cursor-not-allowed">통계 대시보드 (준비중)</div>
        </nav>
      </aside>

      {/* ⬜ 메인 컨텐츠 영역 */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-end mb-8 border-b border-gray-300 pb-4">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[#3b4890]"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>
            사용자 관리
          </h2>
          <div className="text-sm text-gray-600 font-bold">
            아이디 <span className="text-rose-600">admin</span> (으)로 접속하셨습니다.
          </div>
        </header>

        {/* 상단 통계 바 */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4 mb-6 flex gap-8">
          <div className="flex flex-col">
            <span className="text-gray-500 text-xs font-bold mb-1">전체 회원</span>
            <span className="text-2xl font-black text-gray-800">{totalUsers}<span className="text-sm font-medium ml-1 text-gray-500">명</span></span>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="flex flex-col">
            <span className="text-gray-500 text-xs font-bold mb-1">일반 회원</span>
            <span className="text-2xl font-black text-[#3b4890]">{normalUsers}<span className="text-sm font-medium ml-1 text-gray-500">명</span></span>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="flex flex-col">
            <span className="text-gray-500 text-xs font-bold mb-1">관리자 계정</span>
            <span className="text-2xl font-black text-rose-500">{adminCount}<span className="text-sm font-medium ml-1 text-gray-500">명</span></span>
          </div>
        </div>

        {/* 🔎 미나의 특수 무기: 유저 검색 엔진! (대표님 이미지 100% 반영) */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4 mb-6">
          <form method="GET" action="/admin" className="flex flex-col sm:flex-row gap-3 items-center">
            {/* 검색 타입 선택 드롭다운 */}
            <select 
              name="searchType" 
              defaultValue={searchType} 
              className="w-full sm:w-auto p-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-bold text-gray-700 bg-gray-50 h-[42px] cursor-pointer"
            >
              <option value="nickname">필명 (닉네임)</option>
              <option value="id">로그인 아이디</option>
            </select>
            
            <div className="flex-1 flex gap-2 w-full">
              {/* 검색어 입력창 */}
              <input 
                type="text" 
                name="keyword" 
                defaultValue={keyword} 
                placeholder="검색어를 입력하세요 (일부만 입력해도 검색됨)" 
                className="w-full p-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] h-[42px] font-medium"
              />
              
              {/* 조회 버튼 */}
              <button type="submit" className="px-6 bg-[#3b4890] text-white font-bold rounded-sm hover:bg-[#2a3042] transition-colors whitespace-nowrap h-[42px] shadow-sm">
                조회
              </button>

              {/* 검색어가 있을 때만 나타나는 초기화 버튼 */}
              {keyword && (
                <Link href="/admin" className="px-4 bg-gray-200 text-gray-700 font-bold rounded-sm hover:bg-gray-300 transition-colors flex items-center whitespace-nowrap h-[42px]">
                  초기화
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* 회원 목록 테이블 */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-black whitespace-nowrap w-[15%]">고유 번호</th>
                  <th className="px-6 py-4 font-black whitespace-nowrap w-[25%]">로그인 아이디</th>
                  <th className="px-6 py-4 font-black whitespace-nowrap w-[30%]">필명 (닉네임)</th>
                  <th className="px-6 py-4 font-black whitespace-nowrap text-center w-[15%]">권한 상태</th>
                  <th className="px-6 py-4 font-black whitespace-nowrap text-center w-[15%]">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-500">{u.id}</td>
                    <td className="px-6 py-4 font-bold text-gray-800">{u.user_id}</td>
                    {/* 검색된 단어를 하이라이트 할 수 있게 글자색 조절 */}
                    <td className={`px-6 py-4 font-bold ${searchType === 'nickname' && keyword && u.nickname.includes(keyword) ? 'text-[#3b4890]' : 'text-gray-600'}`}>
                      {u.nickname}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.is_admin ? (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-600 text-xs font-black rounded-sm">관리자</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-sm">일반 회원</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.user_id !== 'admin' ? (
                        <KickButton userId={u.user_id} nickname={u.nickname} kickAction={kickUserAction} />
                      ) : (
                        <span className="text-gray-400 text-xs font-bold">삭제 불가</span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {/* 검색 결과가 없거나 회원이 없을 때 */}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-gray-500 font-bold text-base mb-1">
                        {keyword ? `"${keyword}"에 대한 검색 결과가 없습니다.` : '가입된 회원이 없습니다.'}
                      </p>
                      {keyword && <p className="text-sm text-gray-400">검색어 또는 검색 조건을 다시 확인해 주세요.</p>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}