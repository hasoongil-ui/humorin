import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export default async function PostDetailPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  // 💡 1. 방문자 신분증 검사: 지금 이 글을 보고 있는 사람의 닉네임을 확인합니다!
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  // 조회수 올리기
  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;

  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다 😭</div>;
  }

  // 💡 2. 진짜 주인 확인: 지금 보는 사람(currentUser)과 글쓴이(post.author)가 같은 사람인가?!
  const isAuthor = currentUser === post.author;

  const { rows: comments } = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at DESC`;

  const date = new Date(post.date);
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const deletePost = async () => {
    'use server';
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    redirect('/board');
  };

  const addComment = async (formData: FormData) => {
    'use server';
    // 댓글 달려면 로그인이 되어 있어야 합니다!
    if (!currentUser) {
      redirect('/login');
    }

    const content = formData.get('content') as string;
    if (!content) return;
    
    // 💡 3. 댓글도 진짜 닉네임으로 달기!
    await sql`INSERT INTO comments (post_id, author, content) VALUES (${postId}, ${currentUser}, ${content})`;
    revalidatePath(`/board/${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-[#3b4890]">OJEMI</Link>
          
          {/* 로그인한 상태면 이름 띄워주기 */}
          {currentUser && (
            <div className="text-sm font-bold text-gray-600">
              반갑습니다, <span className="text-[#3b4890]">{currentUser}</span>님!
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 mt-4 mb-20">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-3xl font-black text-gray-900 mb-4">{post.title}</h1>
            <div className="flex justify-between text-gray-500 text-sm">
              <div className="font-bold text-[#3b4890] text-base">{post.author}</div>
              <div className="flex gap-4">
                <span className="text-red-500 font-bold">👀 조회수 {post.views || 0}</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className="min-h-[300px] text-gray-800 text-lg whitespace-pre-wrap leading-relaxed">
            {post.content}
          </div>

          <div className="mt-10 border-t pt-6 flex justify-between items-center">
            
            <div className="flex gap-2">
              {/* 🚨 핵심 보안: 주인이 맞을 때(isAuthor)만 이 수정/삭제 버튼들을 보여줍니다! */}
              {isAuthor && (
                <>
                  <Link href={`/board/${postId}/edit`} className="px-6 py-2 bg-[#3b4890] text-white rounded font-bold hover:bg-[#222b5c] transition-colors shadow-sm">
                    ✍️ 이 글 수정하기
                  </Link>
                  <form action={deletePost}>
                    <button type="submit" className="px-6 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600 transition-colors shadow-sm">
                      🗑️ 이 글 완전 삭제하기
                    </button>
                  </form>
                </>
              )}
            </div>

            <Link href="/board" className="px-6 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 transition-colors">
              목록으로 돌아가기
            </Link>
          </div>

          <div className="mt-12 bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-black text-gray-800 mb-4">💬 왁자지껄 수다방 <span className="text-[#3b4890]">({comments.length})</span></h3>
            
            {currentUser ? (
              <form action={addComment} className="flex gap-2 mb-8">
                <input name="content" placeholder="명품 댓글을 남겨보세요!" className="flex-1 p-3 border rounded focus:outline-[#3b4890] font-medium" required />
                <button type="submit" className="px-6 py-3 bg-[#3b4890] text-white rounded font-bold hover:bg-[#222b5c] transition-colors">등록</button>
              </form>
            ) : (
              <div className="mb-8 p-4 bg-gray-100 text-center text-gray-500 rounded font-bold">
                댓글을 작성하려면 <Link href="/login" className="text-[#3b4890] hover:underline">로그인</Link>이 필요합니다.
              </div>
            )}

            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center text-gray-400 py-4">아직 댓글이 없습니다. 첫 번째 댓글의 주인공이 되어보세요!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-white p-4 rounded border shadow-sm">
                    <div className="font-bold text-[#3b4890] text-sm mb-1">{c.author}</div>
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