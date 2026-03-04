import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default function LoginPage() {
  const loginUser = async (formData: FormData) => {
    'use server';
    const userId = formData.get('user_id') as string;
    const password = formData.get('password') as string;

    // 1. 창고에서 아이디와 비밀번호가 똑같은 회원이 있는지 매의 눈으로 찾습니다!
    const { rows } = await sql`
      SELECT * FROM users 
      WHERE user_id = ${userId} AND password = ${password}
    `;
    const user = rows[0];

    // 비밀번호가 틀리거나 없는 아이디면 다시 로그인 화면으로 튕겨냅니다!
    if (!user) {
      redirect('/login');
    }
    
    // 2. 💡 미나의 마법: 검문 통과! 대표님 컴퓨터에 'ojemi_user'라는 마법의 출입증(쿠키)을 발급합니다!
    cookies().set('ojemi_user', user.nickname, { httpOnly: true, secure: true });

    // 로그인 성공하면 메인 게시판으로 VIP 모시듯 슝~ 보냅니다!
    redirect('/board');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
        
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-blue-600 tracking-tighter">OJEMI</Link>
          <h2 className="text-xl font-bold text-gray-800 mt-2">VIP 로그인</h2>
        </div>

        {/* 📝 로그인 검문소 폼 */}
        <form action={loginUser} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">아이디</label>
            <input name="user_id" required placeholder="아이디 입력" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500 transition-colors" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input type="password" name="password" required placeholder="비밀번호 입력" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500 transition-colors" />
          </div>

          <button type="submit" className="w-full py-4 bg-gray-800 text-white rounded font-black text-lg hover:bg-black shadow-md mt-6 transition-colors">
            🔐 로그인하기
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500 border-t pt-4">
          아직 오재미 회원이 아니신가요? <br/>
          <Link href="/signup" className="text-blue-600 font-bold hover:underline">회원가입하러 가기</Link>
        </div>
        
      </div>
    </div>
  );
}