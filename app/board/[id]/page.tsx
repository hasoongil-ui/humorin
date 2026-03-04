import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function PostDetailPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  const { rows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = rows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다 😭</div>;
  }

  const date = new Date(post.date);
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const deletePost = async () => {
    'use server';
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    redirect('/board');
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-blue-600">OJEMI</Link>
        </div>
      </header>

      <nav className="bg-blue-600 text-white overflow-x-auto">
        <div className="max-w-5xl mx-auto flex">
          {['💯 백베스트', '👑 천베스트', '투데이 베스트', '전체글 보기'].map((menu) => (
            <div key={menu} className="px-4 py-3 hover:bg-blue-700 font-bold text-sm cursor-pointer">{menu}</div>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-3xl font-black text-gray-900 mb-4">{post.title}</h1>
            <div className="flex justify-between text-gray-500 text-sm">
              <div className="font-bold text-blue-600 text-base">{post.author}</div>
              <div>{formattedDate}</div>
            </div>
          </div>

          <div className="min-h-[300px] text-gray-800 text-lg whitespace-pre-wrap leading-relaxed">
            {post.content}
          </div>

          <div className="mt-10 border-t pt-6 flex justify-between items-center">
            
            {/* 💡 미나가 추가한 수정 버튼과 삭제 버튼이 나란히 있는 구역! */}
            <div className="flex gap-2">
              <Link href={`/board/${postId}/edit`} className="px-6 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 transition-colors shadow-sm">
                ✍️ 이 글 수정하기
              </Link>

              <form action={deletePost}>
                <button type="submit" className="px-6 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600 transition-colors shadow-sm">
                  🗑️ 이 글 완전 삭제하기
                </button>
              </form>
            </div>

            <Link href="/board" className="px-6 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 transition-colors">
              목록으로 돌아가기
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}