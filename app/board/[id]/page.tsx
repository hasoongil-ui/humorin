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
      <main className="max-w-[1000px] mx-auto p-5 md:p-8 mt-4 mb-20 overflow-hidden">
        
        <div className="border-b-2 border-gray-800 pb-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 break-words">
            <span className="text-[#3b4890] mr-2">[{postData.cat}]</span>
            {postData.cleanTitle}
          </h1>
          <div className="flex flex-col md:flex-row justify-between text-gray-500 text-sm gap-3 md:gap-0">
            <div className="font-bold text-gray-700 text-base">{post.author}</div>
            
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

        {/* 💡 수정된 부분 1: 뚱뚱한 하트 빼고 세련된 네이버/클리앙 스타일 캡슐형 공감 버튼 적용 */}
        <div className="mt-16 flex justify-center border-t border-gray-100 pt-10">
          <form action={toggleLike}>
            <button 
              type="submit" 
              className={`flex items-center gap-2 px-5 py-2.5 border rounded-full transition-all shadow-sm group ${
                hasLiked 
                  ? 'border-rose-500 bg-rose-50 text-rose-500 hover:bg-rose-100' 
                  : 'border-gray-300 bg-white text-gray-500 hover:border-rose-400 hover:text-rose-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 transition-transform group-hover:scale-110 ${hasLiked ? 'text-rose-500' : 'text-gray-400 group-hover:text-rose-400'}`}>
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              <span className="text-sm font-bold">공감</span>
              <span className="text-sm font-black">{post.likes || 0}</span>
            </button>
          </form>
        </div>

        {/* 💡 수정된 부분 2: 눈 아픈 빨간색 톤다운 (인디핑크 #e06c75) & 수정/삭제 버튼 높이 완벽 정렬 */}
        <div className="mt-12 border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-row items-center gap-2 w-full md:w-auto">
            {isAuthor && (
              <>
                <Link href={`/board/${postId}/edit`} className="flex-1 md:flex-none text-center px-6 py-2 bg-[#4b5563] text-white rounded-sm font-bold hover:bg-[#374151] transition-colors shadow-sm text-sm">
                  수정
                </Link>
                <form action={deletePost} className="flex-1 md:flex-none">
                  <button type="submit" className="w-full px-6 py-2 bg-[#e06c75] text-white rounded-sm font-bold hover:bg-[#c95d66] transition-colors shadow-sm text-sm">
                    삭제
                  </button>
                </form>
              </>
            )}
          </div>
          <Link href={`/board?category=${postData.cat !== '일반' ? postData.cat : 'all'}`} className="w-full md:w-auto text-center px-8 py-2 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm shadow-sm">
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