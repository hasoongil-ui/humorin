import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers'; // 💡 미나의 핵심: 자동 로그인을 위한 쿠키 소환!

export default async function SignupPage(props: any) {
  const searchParams = await props.searchParams;
  const showError = searchParams?.error === '1';
  const showMismatch = searchParams?.error === 'mismatch'; // 💡 비밀번호 불일치 에러 신호!

  const registerUser = async (formData: FormData) => {
    'use server';
    const userId = formData.get('user_id') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string; // 💡 확인용 비밀번호 가져오기
    const nickname = formData.get('nickname') as string;

    // 🛡️ 미나의 철통 방어막 1: 비밀번호가 서로 다르면 뒤로 돌려보냅니다!
    if (password !== confirmPassword) {
      redirect('/signup?error=mismatch');
    }

    let success = false;
    try {
      // DB 창고에 안전하게 저장!
      await sql`
        INSERT INTO users (user_id, password, nickname)
        VALUES (${userId}, ${password}, ${nickname})
      `;
      success = true;
    } catch (error) {
      console.error("DB 에러:", error);
    }

    if (success) {
      // 🚀 미나의 철통 방어막 2: 가입 성공 즉시 '자동 로그인' 쿠키 발급!
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'ojemi_user',
        value: nickname || userId,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7일(초 단위) 동안 로그인 유지
      });
      
      // 번거로운 로그인 창 대신, 축하 팡파르와 함께 메인 게시판으로 직행!
      redirect('/board');
    } else {
      // 아이디 중복 등의 에러 시
      redirect('/signup?error=1');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-sm shadow-sm border border-gray-200 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-black text-[#3b4890] tracking-tighter inline-block mb-2">OJEMI</Link>
          <h2 className="text-xl font-bold text-gray-800 mt-2">명품 VIP 회원 가입</h2>
        </div>

        {/* 🚨 경고창 1: 가입 실패 (아이디 중복 등) */}
        {showError && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold text-center rounded-sm border border-red-200">
            가입 실패! 이미 존재하는 아이디입니다.
          </div>
        )}

        {/* 🚨 경고창 2: 비밀번호 불일치 */}
        {showMismatch && (
          <div className="mb-6 p-3 bg-orange-50 text-orange-600 text-sm font-bold text-center rounded-sm border border-orange-200">
            비밀번호가 서로 일치하지 않습니다! <br/> 다시 한 번 확인해 주세요.
          </div>
        )}

        <form action={registerUser} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">아이디</label>
            <input name="user_id" required placeholder="영문, 숫자 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input type="password" name="password" required placeholder="비밀번호 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
          </div>

          {/* 💡 새로 추가된 비밀번호 확인 칸! */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호 확인</label>
            <input type="password" name="confirm_password" required placeholder="비밀번호 한 번 더 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">게시판 닉네임</label>
            <input name="nickname" required placeholder="예: 하순길대표" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
          </div>

          <button type="submit" className="w-full py-3.5 bg-[#2a3042] text-white rounded-sm font-bold text-lg hover:bg-[#1e2335] shadow-sm mt-6 transition-colors">
            🎉 오재미 가입하기
          </button>
        </form>

        {/* 로그인 화면으로 돌아가기 */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-[13px] text-gray-600 font-medium">
          <p className="mb-2 text-gray-500">이미 오재미의 이웃이신가요?</p>
          <Link href="/login" className="text-[#3b4890] font-bold hover:underline inline-block text-[14px]">
            로그인하러 가기 👉
          </Link>
        </div>

      </div>
    </div>
  );
}