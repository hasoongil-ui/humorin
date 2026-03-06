import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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

  // 💡 미나의 핵심 마법: 공감을 누르면 +1, 다시 누르면 취소(-1) 되는 완벽한 토글 스위치!
  const toggleLike = async () => {
    'use server';
    if (!currentUser) redirect('/login');
    
    const { rows: checkRows } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
    
    if (checkRows.length > 0) {
      // 이미 공감했다면? -> 공감 취소 (하트 뺏기!)
      await sql`DELETE FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
      await sql`UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${postId}`;
    } else {
      // 아직 안 했다면? -> 공감 추가 (하트 뿅!)
      await sql`INSERT INTO likes (post_id, author) VALUES (${postId}, ${currentUser})`;
      await sql`UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE id = ${postId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  return (
    <div className="bg-white font-sans rounded-sm shadow-sm border border-gray-200">
      {/* 💡 중복되던 상단 로고 헤더는 철거했습니다! 이제 모든 화면에 GNB(지붕)가 덮여있습니다! */}

      <main className="max-w-[1000px] mx-auto p-5 md:p-8 mt-4 mb-20 overflow-hidden">
        
        <div className="border-b-2 border-gray-800 pb-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 break-words">
            <span className="text-[#3b4890] mr-2">[{postData.cat}]</span>
            {postData.cleanTitle}
          </h1>
          <div className="flex flex-col md:flex-row justify-between text-gray-500 text-sm gap-3 md:gap-0">
            <div className="font-bold text-gray-700 text-base">{post.author}</div>
            
            {/* 💡 대표님 지시대로 [조회수] -> [공감] 순서로 변경하고 디자인을 싹 다듬었습니다! */}
            <div className="flex flex-wrap gap-4 items-center font-medium">
              <span className="text-gray-400">{formattedDate}</span>
              <span className="text-gray-500">조회 {post.views || 0}</span>
              <span className="text-rose-500 font-bold">❤️ 공감 {post.likes || 0}</span>
            </div>
          </div>
        </div>

        <div 
          className="min-h-[200px] md:min-h-[400px] text-gray-900 text-base md:text-[17px] whitespace-pre-wrap leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* 💡 미나의 야심작: 네이버 블로그 감성의 동그랗고 예쁜 하트 공감 버튼! */}
        <div className="mt-16 flex justify-center border-t border-gray-100 pt-10">
          <form action={toggleLike}>
            <button 
              type="submit" 
              className={`flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 transition-all shadow-sm group ${
                hasLiked 
                  ? 'border-rose-500 bg-rose-50 text-rose-500 hover:bg-rose-100' 
                  : 'border-gray-300 bg-white text-gray-500 hover:border-rose-400 hover:text-rose-400'
              }`}
            >
              <span className="text-2xl md:text-3xl mb-1 group-hover:scale-110 transition-transform">
                {hasLiked ? '❤️' : '🤍'}
              </span>
              <span className="font-bold text-[13px] md:text-sm">공감 {post.likes || 0}</span>
            </button>
          </form>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {isAuthor && (
              <>
                <Link href={`/board/${postId}/edit`} className="w-full text-center px-6 py-2.5 bg-gray-600 text-white rounded-sm font-bold hover:bg-gray-700 transition-colors shadow-sm text-sm">
                  수정
                </Link>
                <form action={deletePost} className="w-full">
                  <button type="submit" className="w-full px-6 py-2.5 bg-red-500 text-white rounded-sm font-bold hover:bg-red-600 transition-colors shadow-sm text-sm">
                    삭제
                  </button>
                </form>
              </>
            )}
          </div>
          <Link href={`/board?category=${postData.cat !== '일반' ? postData.cat : 'all'}`} className="w-full md:w-auto text-center px-8 py-2.5 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm shadow-sm">
            목록으로
          </Link>
        </div>

        <div className="mt-16 bg-gray-50 p-5 md:p-6 rounded-sm border border-gray-200">
          <h3 className="text-[17px] font-black text-gray-800 mb-6">💬 댓글 <span className="text-[#e74c3c]">({comments.length})</span></h3>
          
          {currentUser ? (
            <form action={addComment} className="flex flex-col md:flex-row gap-2 mb-10 w-full">
              <input name="content" placeholder="댓글을 남겨보세요." className="w-full md:flex-1 p-3 border border-gray-300 rounded-sm focus:border-gray-500 outline-none font-medium text-sm" required />
              <button type="submit" className="w-full md:w-24 py-3 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm">등록</button>
            </form>
          ) : (
            <div className="mb-10 p-4 bg-white border border-gray-200 text-center text-gray-500 rounded-sm font-bold text-sm shadow-sm">
              댓글을 작성하려면 <Link href="/login" className="text-[#3b4890] hover:underline">로그인</Link>이 필요합니다.
            </div>
          )}

          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="text-center text-gray-400 py-6 font-medium text-sm">아직 등록된 댓글이 없습니다.</div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm break-words">
                  <div className="font-bold text-gray-800 text-[13px] mb-1.5">{c.author}</div>
                  <div className="text-gray-700 text-[15px]">{c.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}