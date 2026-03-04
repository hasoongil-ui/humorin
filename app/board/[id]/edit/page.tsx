import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function EditPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  // 1. 창고에서 대표님이 원래 쓰셨던 글을 그대로 꺼내옵니다!
  const { rows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = rows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다 😭</div>;
  }

  // 2. 수정한 내용을 창고에 다시 '덮어쓰기' 하는 미나의 마법!
  const updatePost = async (formData: FormData) => {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    
    await sql`
      UPDATE posts 
      SET title = ${title}, content = ${content} 
      WHERE id = ${postId}
    `;
    
    // 수정이 끝나면 다시 그 글을 읽는 화면으로 튕겨냅니다!
    redirect(`/board/${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-[#3b4890]">OJEMI</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-black text-gray-800 mb-6">✍️ 명품 글 수정하기</h2>
          
          {/* 💡 여기에 수정한 내용을 묶어서 updatePost 마법으로 보냅니다! */}
          <form action={updatePost}>
            <div className="mb-4">
              <input 
                name="title"
                defaultValue={post.title}
                className="w-full p-3 border rounded focus:outline-blue-500 font-bold text-gray-800" 
                required
              />
            </div>
            
            <div className="mb-4">
              <textarea 
                name="content"
                defaultValue={post.content}
                className="w-full p-4 border rounded h-96 focus:outline-blue-500 resize-none text-lg text-gray-800" 
                required
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Link href={`/board/${postId}`} className="px-6 py-2 bg-gray-100 rounded hover:bg-gray-200 font-bold text-gray-700">
                취소
              </Link>
              <button 
                type="submit"
                className="px-8 py-2 bg-[#3b4890] text-white rounded font-extrabold hover:bg-blue-700 shadow-lg"
              >
                ✨ 수정 완료!
              </button>
            </div>
          </form>

        </div>
      </main>
    </div>
  );
}