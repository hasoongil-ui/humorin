import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SignupPage(props: any) {
  const searchParams = await props.searchParams;
  const showError = searchParams?.error === '1';

  const registerUser = async (formData: FormData) => {
    'use server';
    const userId = formData.get('user_id') as string;
    const password = formData.get('password') as string;
    const nickname = formData.get('nickname') as string;

    let success = false;
    try {
      await sql`
        INSERT INTO users (user_id, password, nickname)
        VALUES (${userId}, ${password}, ${nickname})
      `;
      success = true;
    } catch (error) {
      console.error("DB 에러:", error);
    }

    if (success) {
      redirect('/board');
    } else {
      // 에러가 나면 먹통이 되지 않고, 주소 뒤에 신호를 달아서 보냅니다!
      redirect('/signup?error=1');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-blue-600 tracking-tighter">OJEMI</Link>
          <h2 className="text-xl font-bold text-gray-800 mt-2">명품 VIP 회원 가입</h2>
        </div>

        {/* 🚨 먹통 방지: 실패하면 빨간 경고창이 뜹니다! */}
        {showError && (
          <div className="mb-6 p-3 bg-red-100 text-red-600 text-sm font-bold text-center rounded border border-red-200">
            가입 실패! 이미 있는 아이디거나 <br/> 창고(DB)에 회원 상자가 없습니다.
          </div>
        )}

        <form action={registerUser} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">아이디</label>
            <input name="user_id" required placeholder="영문, 숫자 입력" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input type="password" name="password" required placeholder="비밀번호 입력" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">게시판 닉네임</label>
            <input name="nickname" required placeholder="예: 하순길대표" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500" />
          </div>
          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded font-black text-lg hover:bg-blue-700 shadow-md mt-6 transition-colors">
            🎉 오재미 가입하기
          </button>
        </form>
      </div>
    </div>
  );
}