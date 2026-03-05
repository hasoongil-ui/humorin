import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export default async function PostDetailPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;

  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다 😭</div>;
  }

  const isAuthor = currentUser === post.author;
  const { rows: comments } = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at DESC`;

  let hasLiked = false;
  if (currentUser) {
    const { rows: likeRows } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
    if (likeRows.length > 0) {
      hasLiked = true;
    }
  }

  const date = new Date(post.date);
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const deletePost = async () => {
    'use server';
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    redirect('/board');
  };

  const addComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) redirect('/login');
    const content = formData.get('content') as string;
    if (!content) return;
    await sql`INSERT INTO comments (post_id, author, content) VALUES (${postId}, ${currentUser}, ${content})`;
    revalidatePath(`/board/${postId}`);
  };

  const likePost = async () => {
    'use server';
    if (!currentUser) redirect('/login');
    const { rows: checkRows } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
    if (checkRows.length > 0) return; 
    await sql`INSERT INTO likes (post_id, author) VALUES (${postId}, ${currentUser})`;
    await sql`UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE id = ${postId}`;
    revalidatePath(`/board/${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-[#3b4890]">OJEMI</Link>
          {currentUser && (
            <div className="text-sm font-bold text-gray-600">
              반갑습니다, <span className="text-[#3b4890]">{currentUser}</span>님!
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-2 md:p-4 mt-4 mb-20 overflow-hidden">
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-8">
          
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 break-words">{post.title}</h1>
            <div className="flex flex-col md:flex-row justify-between text-gray-500 text-sm gap-2 md:gap-0">
              <div className="font-bold text-[#3b4890] text-base">{post.author}</div>
              <div className="flex flex-wrap gap-4 items-center">
                <span className="text-red-500 font-bold">👀 조회수 {post.views || 0}</span>
                <span className="text-blue-600 font-bold">👍 추천수 {post.likes || 0}</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* 💡 미나의 마법: 영어를 진짜 사진으로 보여주는 주문(dangerouslySetInnerHTML) 장착 완료! */}
          <div 
            className="min-h-[200px] md:min-h-[300px] text-gray-800 text-base md:text-lg whitespace-pre-wrap leading-relaxed break-words"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-8 flex justify-center">
            {hasLiked ? (
              <button disabled className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed shadow-inner">
                <span className="text-2xl md:text-3xl mb-1 opacity-50">👍</span>
                <span className="font-bold text-xs md:text-sm">추천완료</span>
              </button>
            ) : (
              <form action={likePost}>
                <button type="submit" className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[#3b4890] bg-white text-[#3b4890] hover:bg-[#3b4890] hover:text-white transition-all shadow-md group">
                  <span className="text-2xl md:text-3xl mb-1 group-hover:scale-125 transition-transform">👍</span>
                  <span className="font-bold text-xs md:text-sm">추천 {post.likes || 0}</span>
                </button>
              </form>
            )}
          </div>

          <div className="mt-10 border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              {isAuthor && (
                <>
                  <Link href={`/board/${postId}/edit`} className="w-full text-center px-6 py-2 bg-[#3b4890] text-white rounded font-bold hover:bg-[#222b5c] transition-colors shadow-sm">
                    ✍️ 수정하기
                  </Link>
                  <form action={deletePost} className="w-full">
                    <button type="submit" className="w-full px-6 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600 transition-colors shadow-sm">
                      🗑️ 완전 삭제
                    </button>
                  </form>
                </>
              )}
            </div>
            <Link href="/board" className="w-full md:w-auto text-center px-6 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 transition-colors">
              목록으로 돌아가기
            </Link>
          </div>

          <div className="mt-12 bg-gray-50 p-4 md:p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg md:text-xl font-black text-gray-800 mb-4">💬 왁자지껄 수다방 <span className="text-[#3b4890]">({comments.length})</span></h3>
            
            {currentUser ? (
              <form action={addComment} className="flex flex-col md:flex-row gap-2 mb-8 w-full">
                <input name="content" placeholder="명품 댓글을 남겨보세요!" className="w-full md:flex-1 p-3 border rounded focus:outline-[#3b4890] font-medium" required />
                <button type="submit" className="w-full md:w-auto px-6 py-3 bg-[#3b4890] text-white rounded font-bold hover:bg-[#222b5c] transition-colors">등록</button>
              </form>
            ) : (
              <div className="mb-8 p-4 bg-gray-100 text-center text-gray-500 rounded font-bold text-sm md:text-base">
                댓글을 작성하려면 <Link href="/login" className="text-[#3b4890] hover:underline">로그인</Link>이 필요합니다.
              </div>
            )}

            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center text-gray-400 py-4 text-sm md:text-base">아직 댓글이 없습니다. 첫 번째 댓글의 주인공이 되어보세요!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-white p-3 md:p-4 rounded border shadow-sm break-words">
                    <div className="font-bold text-[#3b4890] text-xs md:text-sm mb-1">{c.author}</div>
                    <div className="text-gray-800 text-sm md:text-base">{c.content}</div>
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