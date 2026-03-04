import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache'; // 💡 미나의 마법: 댓글 달면 새로고침 없이 바로 뿅! 나타나게 해줍니다.

export default async function PostDetailPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  // 1. 창고에서 대표님 글 가져오기
  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다 😭</div>;
  }

  // 2. 창고에서 이 글에 달린 '댓글'들만 싹 다 가져오기 (최신순으로!)
  const { rows: comments } = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at DESC`;

  const date = new Date(post.date);
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const deletePost = async () => {
    'use server';
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    redirect('/board');
  };

  // 💡 미나의 댓글 배달원! 댓글을 창고에 넣고 화면을 바로 갱신합니다.
  const addComment = async (formData: FormData) => {
    'use server';
    const content = formData.get('content') as string;
    if (!content) return;
    
    await sql`INSERT INTO comments (post_id, content) VALUES (${postId}, ${content})`;
    revalidatePath(`/board/${postId}`);
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

      <main className="max-w-5xl mx-auto p-4 mt-4 mb-20">
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

          {/* 💬 여기가 새로 추가된 수다방(댓글) 구역입니다! 💬 */}
          <div className="mt-12 bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-black text-gray-800 mb-4">💬 왁자지껄 수다방 <span className="text-blue-600">({comments.length})</span></h3>
            
            {/* 댓글 입력창 */}
            <form action={addComment} className="flex gap-2 mb-8">
              <input 
                name="content" 
                placeholder="명품 댓글을 남겨보세요!" 
                className="flex-1 p-3 border rounded focus:outline-blue-500 font-medium" 
                required 
              />
              <button type="submit" className="px-6 py-3 bg-gray-800 text-white rounded font-bold hover:bg-black transition-colors">
                등록
              </button>
            </form>

            {/* 달린 댓글들 보여주는 곳 */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center text-gray-400 py-4">아직 댓글이 없습니다. 첫 번째 댓글의 주인공이 되어보세요!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-white p-4 rounded border shadow-sm">
                    <div className="font-bold text-blue-600 text-sm mb-1">{c.author}</div>
                    <div className="text-gray-800">{c.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}