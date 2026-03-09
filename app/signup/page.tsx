import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function SignupPage(props: any) {
  const searchParams = await props.searchParams;
  const showError = searchParams?.error === '1';
  const showMismatch = searchParams?.error === 'mismatch';

  const registerUser = async (formData: FormData) => {
    'use server';
    const userId = formData.get('user_id') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;
    const nickname = formData.get('nickname') as string;
    const email = formData.get('email') as string; // 💡 이메일 데이터 수집!

    if (password !== confirmPassword) {
      redirect('/signup?error=mismatch');
    }

    let success = false;
    try {
      // 💡 DB 쿼리에 email 기둥 추가 완료!
      await sql`
        INSERT INTO users (user_id, password, nickname, email)
        VALUES (${userId}, ${password}, ${nickname}, ${email})
      `;
      success = true;
    } catch (error) {
      console.error("DB 에러:", error);
    }

    if (success) {
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'ojemi_user',
        value: nickname || userId,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      
      redirect('/board');
    } else {
      redirect('/signup?error=1');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-sm shadow-sm border border-gray-200 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-black text-[#3b4890] tracking-tighter inline-block mb-2">OJEMI</Link>
          <h2 className="text-xl font-bold text-gray-800 mt-2">회원 가입</h2>
        </div>

        {showError && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold text-center rounded-sm border border-red-200">
            가입 실패! 이미 존재하는 아이디입니다.
          </div>
        )}

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

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호 확인</label>
            <input type="password" name="confirm_password" required placeholder="비밀번호 한 번 더 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">게시판 닉네임</label>
            <input name="nickname" required placeholder="예: 상실의 시대" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
          </div>

          {/* 💡 새로 추가된 이메일 입력 칸 & 정중한 안내 문구 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">이메일 (비밀번호 재설정용)</label>
            <input type="email" name="email" required placeholder="이메일 주소 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium mb-1.5" />
            <p className="text-[11px] text-gray-500 leading-tight">
              * 입력하신 이메일은 비밀번호 분실 시 본인 확인 및 재설정 용도로만 안전하게 보관되며, 그 외의 다른 목적으로는 절대 사용되지 않습니다.
            </p>
          </div>

          {/* 💡 이모티콘을 빼고 묵직한 신뢰감을 주는 버튼으로 변경 */}
          <button type="submit" className="w-full py-3.5 bg-[#2a3042] text-white rounded-sm font-bold text-lg hover:bg-[#1e2335] shadow-sm mt-6 transition-colors">
            오재미 가입하기
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-[13px] text-gray-600 font-medium">
          <p className="mb-2 text-gray-500">이미 오재미의 회원이신가요?</p>
          <Link href="/login" className="text-[#3b4890] font-bold hover:underline inline-block text-[14px]">
            로그인하러 가기
          </Link>
        </div>

      </div>
    </div>
  );
}