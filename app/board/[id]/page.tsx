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

  // 💡 미나의 자동 창고(DB) 업그레이드 마법! 
  // 대댓글과 댓글 공감 기능을 위해 기존 창고에 필요한 칸을 1초 만에 자동으로 만들어냅니다!
  try { await sql`ALTER TABLE comments ADD COLUMN parent_id INTEGER`; } catch (e) { /* 이미 있으면 패스 */ }
  try { await sql`ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0`; } catch (e) { /* 이미 있으면 패스 */ }
  try { await sql`CREATE TABLE IF NOT EXISTS comment_likes ( comment_id INTEGER, author VARCHAR(255), PRIMARY KEY (comment_id, author) )`; } catch (e) { /* 이미 있으면 패스 */ }

  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;

  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다 😭</div>;
  }

  const isAuthor = currentUser === post.author;
  
  // 댓글 목록을 최신순(대댓글 포함)으로 가져옵니다.
  const { rows: comments } = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at ASC`;

  let hasLiked = false;
  if (currentUser) {
    const { rows: likeRows } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
    if (likeRows.length > 0) hasLiked = true;
  }

  const dbDate = new Date(post.date);
  const kstDate = new Date(dbDate.getTime() + 9 * 60 * 60 * 1000);
  const formattedDate = `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')} ${String(kstDate.getHours()).padStart(2, '0')}:${String(kstDate.getMinutes()).padStart(2, '0')}`;
  const postData = extractData(post.title);

  // --- ⚡ [액션] 게시글 삭제 ---
  const deletePost = async () => {
    'use server';
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    redirect('/board');
  };

  // --- ⚡ [액션] 게시글 공감 ---
  const toggleLike = async () => {
    'use server';
    if (!currentUser) redirect('/login');
    const { rows: checkRows } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
      await sql`UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${postId}`;
    } else {
      await sql`INSERT INTO likes (post_id, author) VALUES (${postId}, ${currentUser})`;
      await sql`UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE id = ${postId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  // --- ⚡ [액션] 댓글 & 대댓글 등록 ---
  const addComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) redirect('/login');
    const content = formData.get('content') as string;
    const parentId = formData.get('parentId') as string; // 대댓글이면 부모 ID가 들어옵니다!
    if (!content) return;
    
    if (parentId) {
      await sql`INSERT INTO comments (post_id, author, content, parent_id) VALUES (${postId}, ${currentUser}, ${content}, ${parentId})`;
    } else {
      await sql`INSERT INTO comments (post_id, author, content) VALUES (${postId}, ${currentUser}, ${content})`;
    }
    revalidatePath(`/board/${postId}`);
  };

  // --- ⚡ [액션] 댓글 공감 토글 ---
  const toggleCommentLike = async (formData: FormData) => {
    'use server';
    if (!currentUser) redirect('/login');
    const commentId = formData.get('commentId') as string;
    
    const { rows: checkRows } = await sql`SELECT * FROM comment_likes WHERE comment_id = ${commentId} AND author = ${currentUser}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM comment_likes WHERE comment_id = ${commentId} AND author = ${currentUser}`;
      await sql`UPDATE comments SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${commentId}`;
    } else {
      await sql`INSERT INTO comment_likes (comment_id, author) VALUES (${commentId}, ${currentUser})`;
      await sql`UPDATE comments SET likes = COALESCE(likes, 0) + 1 WHERE id = ${commentId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  // 댓글 데이터 분리 (일반 댓글 vs 대댓글)
  const rootComments = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  return (
    <div className="bg-white font-sans rounded-sm shadow-sm border border-gray-200">
      <main className="max-w-[1000px] mx-auto p-5 md:p-8 mt-4 mb-20 overflow-hidden">
        
        {/* 본문 헤더 */}
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

        {/* 본문 내용 */}
        <div 
          className="min-h-[200px] md:min-h-[400px] text-gray-900 text-base md:text-[17px] whitespace-pre-wrap leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* 본문 공감 버튼 */}
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

        {/* 본문 수정/삭제/목록 버튼 */}
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

        {/* =========================================
            💡 미나의 핵심: 트렌디한 대댓글 & 공감 영역
            ========================================= */}
        <div className="mt-16 bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm">
          
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-800">
              💬 댓글 <span className="text-[#e74c3c] ml-1">{comments.length}</span>
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {rootComments.length === 0 ? (
              <div className="text-center text-gray-400 py-10 font-medium text-sm">아직 등록된 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</div>
            ) : (
              rootComments.map((c) => (
                <div key={c.id} className="group">
                  
                  {/* --- 일반 댓글 영역 --- */}
                  <div className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-gray-800 text-[14px]">{c.author}</div>
                    </div>
                    <div className="text-gray-700 text-[15px] mb-3 leading-relaxed break-words">{c.content}</div>
                    
                    {/* 댓글 하단 버튼 (답글 & 공감) */}
                    <div className="flex items-center gap-3">
                      {/* 숨겨진 체크박스로 답글 폼을 열고 닫는 CSS 마법! */}
                      <label htmlFor={`reply-${c.id}`} className="cursor-pointer text-[13px] text-gray-500 font-bold hover:text-[#3b4890] flex items-center gap-1 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        답글
                      </label>
                      
                      <form action={toggleCommentLike}>
                        <input type="hidden" name="commentId" value={c.id} />
                        <button type="submit" className={`text-[13px] font-bold flex items-center gap-1 transition-colors ${c.likes > 0 ? 'text-rose-500 hover:text-rose-600' : 'text-gray-500 hover:text-rose-500'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                          공감 {c.likes || 0}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* --- 대댓글 작성 폼 (답글 버튼 누르면 스르륵 나타남) --- */}
                  <input type="checkbox" id={`reply-${c.id}`} className="hidden peer" />
                  <div className="hidden peer-checked:block bg-gray-100 p-4 border-t border-gray-200">
                    {currentUser ? (
                      <form action={addComment} className="flex flex-col sm:flex-row gap-2 relative pl-6">
                        <div className="absolute left-2 top-3 border-l-2 border-b-2 border-gray-300 w-3 h-3 rounded-bl-sm"></div>
                        <input type="hidden" name="parentId" value={c.id} />
                        <input name="content" placeholder={`@${c.author} 님에게 답글 남기기...`} className="flex-1 p-3 border border-gray-300 rounded-sm focus:border-[#3b4890] outline-none font-medium text-sm bg-white" required />
                        <button type="submit" className="w-full sm:w-20 py-3 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm">등록</button>
                      </form>
                    ) : (
                      <div className="text-center text-gray-500 font-bold text-sm py-2">대댓글을 작성하려면 로그인해주세요.</div>
                    )}
                  </div>

                  {/* --- 대댓글(자식 댓글) 목록 렌더링 --- */}
                  {replies.filter(r => r.parent_id === c.id).map((reply) => (
                    <div key={reply.id} className="bg-gray-50 p-4 pl-10 sm:pl-14 border-t border-gray-100 relative">
                      {/* 대댓글 꺾쇠 아이콘 (ㄴ 모양) */}
                      <div className="absolute left-4 sm:left-6 top-5 border-l-2 border-b-2 border-gray-300 w-3 h-3 rounded-bl-sm"></div>
                      
                      <div className="font-bold text-gray-800 text-[13px] mb-1.5">{reply.author}</div>
                      <div className="text-gray-700 text-[14px] mb-2">{reply.content}</div>
                      
                      {/* 대댓글 공감 버튼 */}
                      <form action={toggleCommentLike}>
                        <input type="hidden" name="commentId" value={reply.id} />
                        <button type="submit" className={`text-[12px] font-bold flex items-center gap-1 transition-colors ${reply.likes > 0 ? 'text-rose-500 hover:text-rose-600' : 'text-gray-400 hover:text-rose-500'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                          {reply.likes || 0}
                        </button>
                      </form>
                    </div>
                  ))}

                </div>
              ))
            )}
          </div>

          {/* 메인 댓글 작성 폼 (가장 아래 배치) */}
          <div className="p-5 bg-gray-50 border-t border-gray-200">
            {currentUser ? (
              <form action={addComment} className="flex flex-col sm:flex-row gap-2">
                <input name="content" placeholder="주제와 무관한 댓글이나 악플은 삭제될 수 있습니다." className="flex-1 p-3.5 border border-gray-300 rounded-sm focus:border-[#3b4890] outline-none font-medium text-sm bg-white" required />
                <button type="submit" className="w-full sm:w-24 py-3.5 bg-[#3b4890] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm">댓글 등록</button>
              </form>
            ) : (
              <div className="p-4 bg-white border border-gray-200 text-center text-gray-500 rounded-sm font-bold text-sm shadow-sm">
                댓글을 작성하려면 <Link href="/login" className="text-[#3b4890] hover:underline">로그인</Link>이 필요합니다.
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}