import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function LoginPage(props: any) {
  const searchParams = await props.searchParams;
  const showError = searchParams?.error === '1';

  const loginUser = async (formData: FormData) => {
    'use server';
    const userId = formData.get('user_id') as string;
    const password = formData.get('password') as string;

    let user = null;
    try {
      const { rows } = await sql`
        SELECT * FROM users 
        WHERE user_id = ${userId} AND password = ${password}
      `;
      user = rows[0];
    } catch (error) {
      console.error("DB 에러:", error);
    }

    if (!user) {
      redirect('/login?error=1');
    }
    
    // 💡 미나의 최신 패치: Next.js 15에서는 출입증(쿠키)을 발급할 때 무조건 기다려야(await) 합니다!
    const cookieStore = await cookies();
    cookieStore.set('ojemi_user', user.nickname, { httpOnly: true, secure: true });

    redirect('/board');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-blue-600 tracking-tighter">OJEMI</Link>
          <h2 className="text-xl font-bold text-gray-800 mt-2">VIP 로그인</h2>
        </div>

        {/* 🚨 먹통 방지: 실패하면 빨간 경고창이 뜹니다! */}
        {showError && (
          <div className="mb-6 p-3 bg-red-100 text-red-600 text-sm font-bold text-center rounded border border-red-200">
            로그인 실패! 아이디/비번을 확인하시거나 <br/> 창고(DB) 상태를 점검해 주세요.
          </div>
        )}

        <form action={loginUser} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">아이디</label>
            <input name="user_id" required placeholder="아이디 입력" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input type="password" name="password" required placeholder="비밀번호 입력" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500" />
          </div>
          <button type="submit" className="w-full py-4 bg-gray-800 text-white rounded font-black text-lg hover:bg-black shadow-md mt-6 transition-colors">
            🔐 로그인하기
          </button>
        </form>
      </div>
    </div>
  );
}