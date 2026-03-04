import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';

// 💡 미나의 패치: 주소창에 에러 신호가 있으면 잡아냅니다!
export default async function LoginPage(props: any) {
  const searchParams = await props.searchParams;
  const showError = searchParams.error === '1';

  const loginUser = async (formData: FormData) => {
    'use server';
    const userId = formData.get('user_id') as string;
    const password = formData.get('password') as string;

    const { rows } = await sql`
      SELECT * FROM users 
      WHERE user_id = ${userId} AND password = ${password}
    `;
    const user = rows[0];

    // 💡 틀렸을 때 그냥 제자리에 두지 않고, ?error=1 이라는 신호를 달아서 보냅니다!
    if (!user) {
      redirect('/login?error=1');
    }
    
    cookies().set('ojemi_user', user.nickname, { httpOnly: true, secure: true });
    redirect('/board');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
        
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-blue-600 tracking-tighter">OJEMI</Link>
          <h2 className="text-xl font-bold text-gray-800 mt-2">VIP 로그인</h2>
        </div>

        {/* 🚨 틀렸을 때 나타나는 빨간색 경고창! */}
        {showError && (
          <div className="mb-6 p-3 bg-red-100 text-red-600 text-sm font-bold text-center rounded border border-red-200">
            아이디나 비밀번호가 틀렸습니다! <br/> 대소문자나 띄어쓰기를 확인해 주세요 😭
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
        
        <div className="mt-6 text-center text-sm text-gray-500 border-t pt-4">
          아직 오재미 회원이 아니신가요? <br/>
          <Link href="/signup" className="text-blue-600 font-bold hover:underline">회원가입하러 가기</Link>
        </div>
        
      </div>
    </div>
  );
}