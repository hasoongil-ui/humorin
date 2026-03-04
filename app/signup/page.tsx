import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const registerUser = async (formData: FormData) => {
    'use server';
    const userId = formData.get('user_id') as string;
    const password = formData.get('password') as string;
    const nickname = formData.get('nickname') as string;

    try {
      await sql`
        INSERT INTO users (user_id, password, nickname)
        VALUES (${userId}, ${password}, ${nickname})
      `;
    } catch (error) {
      console.error("가입 에러:", error);
      redirect('/signup'); 
    }
    
    redirect('/board');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
        
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-blue-600 tracking-tighter">OJEMI</Link>
          <h2 className="text-xl font-bold text-gray-800 mt-2">명품 VIP 회원 가입</h2>
        </div>

        <form action={registerUser} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">아이디</label>
            <input name="user_id" required placeholder="영문, 숫자 입력" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500 transition-colors" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input type="password" name="password" required placeholder="비밀번호 입력" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500 transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">게시판 닉네임 (멋진 이름)</label>
            <input name="nickname" required placeholder="예: 하순길대표" className="w-full p-3 border rounded bg-gray-50 focus:bg-white focus:outline-blue-500 transition-colors" />
          </div>

          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded font-black text-lg hover:bg-blue-700 shadow-md mt-6 transition-colors">
            🎉 오재미 가입하기
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500 border-t pt-4">
          이미 오재미 회원이신가요? <br/>
          <Link href="/login" className="text-blue-600 font-bold hover:underline">로그인하러 가기</Link>
        </div>
        
      </div>
    </div>
  );
}