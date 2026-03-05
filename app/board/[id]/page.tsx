import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// 💡 미나의 초고속 판독기 복구!
function extractData(fullTitle: string) {
  if (!fullTitle) return { cat: '일반', cleanTitle: '' };
  const match = fullTitle.match(/^\[(.*?)\]\s*(.*)$/);
  return match ? { cat: match[1], cleanTitle: match[2] } : { cat: '일반', cleanTitle: fullTitle };
}

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

  const dbDate = new Date(post.date);
  const kstDate = new Date(dbDate.getTime() + 9 * 60 * 60 * 1000);
  const formattedDate = `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')} ${String(kstDate.getHours()).padStart(2, '0')}:${String(kstDate.getMinutes()).padStart(2, '0')}`;

  const postData = extractData(post.title);

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
    <div className="min-h-screen bg-white font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-black text-[#3b4890] tracking-tighter">OJEMI</Link>
          {currentUser && (
            <div className="text-sm font-bold text-gray-600">
              반갑습니다, <span className="text-[#3b4890]">{currentUser}</span>님!
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4 mb-20 overflow-hidden">
        
        <div className="border-b-2 border-gray-800 pb-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 break-words">
            <span className="text-[#3b4890] mr-2">[{postData.cat}]</span>
            {postData.cleanTitle}
          </h1>
          <div className="flex flex-col md:flex-row justify-between text-gray-500 text-sm gap-2 md:gap-0">
            <div className="font-bold text-gray-700 text-base">{post.author}</div>
            <div className="flex flex-wrap gap-4 items-center font-medium">
              <span className="text-red-500">👀 조회 {post.views || 0}</span>
              <span className="text-blue-600">👍 추천 {post.likes || 0}</span>
              <span className="text-gray-400">{formattedDate}</span>
            </div>
          </div>
        </div>

        <div 
          className="min-h-[200px] md:min-h-[400px] text-gray-900 text-base md:text-lg whitespace-pre-wrap leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="mt-12 flex justify-center border-t border-gray-200 pt-10">
          {hasLiked ? (
            <button disabled className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed shadow-inner">
              <span className="text-3xl mb-1 opacity-50">👍</span>
              <span className="font-bold text-sm">추천완료</span>
            </button>
          ) : (
            <form action={likePost}>
              <button type="submit" className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 border-[#3b4890] bg-white text-[#3b4890] hover:bg-[#3b4890] hover:text-white transition-all shadow-md group">
                <span className="text-3xl mb-1 group-hover:scale-125 transition-transform">👍</span>
                <span className="font-bold text-sm">추천 {post.likes || 0}</span>
              </button>
            </form>
          )}
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {isAuthor && (
              <>
                <Link href={`/board/${postId}/edit`} className="w-full text-center px-6 py-2.5 bg-[#3b4890] text-white rounded font-bold hover:bg-[#222b5c] transition-colors shadow-sm">
                  ✍️ 수정하기
                </Link>
                <form action={deletePost} className="w-full">
                  <button type="submit" className="w-full px-6 py-2.5 bg-red-500 text-white rounded font-bold hover:bg-red-600 transition-colors shadow-sm">
                    🗑️ 완전 삭제
                  </button>
                </form>
              </>
            )}
          </div>
          <Link href={`/board?category=${postData.cat !== '일반' ? postData.cat : 'all'}`} className="w-full md:w-auto text-center px-8 py-2.5 bg-gray-800 text-white rounded font-bold hover:bg-gray-900 transition-colors">
            목록으로
          </Link>
        </div>

        <div className="mt-16 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-black text-gray-800 mb-6">💬 댓글 <span className="text-[#3b4890]">({comments.length})</span></h3>
          
          {currentUser ? (
            <form action={addComment} className="flex flex-col md:flex-row gap-2 mb-10 w-full">
              <input name="content" placeholder="댓글을 남겨보세요." className="w-full md:flex-1 p-3 border border-gray-300 rounded focus:border-[#3b4890] outline-none font-medium" required />
              <button type="submit" className="w-full md:w-auto px-8 py-3 bg-gray-800 text-white rounded font-bold hover:bg-gray-900 transition-colors">등록</button>
            </form>
          ) : (
            <div className="mb-10 p-4 bg-gray-200 text-center text-gray-600 rounded font-bold text-sm">
              댓글을 작성하려면 <Link href="/login" className="text-[#3b4890] hover:underline">로그인</Link>이 필요합니다.
            </div>
          )}

          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center text-gray-400 py-6 font-medium">아직 등록된 댓글이 없습니다.</div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded border border-gray-200 shadow-sm break-words">
                  <div className="font-bold text-gray-800 text-sm mb-2">{c.author}</div>
                  <div className="text-gray-700 text-base">{c.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}