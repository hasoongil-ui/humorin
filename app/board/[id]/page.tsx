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
  // 대댓글, 공감, 그리고 '이미지 첨부' 기능을 위한 칸을 자동으로 만들어냅니다!
  try { await sql`ALTER TABLE comments ADD COLUMN parent_id INTEGER`; } catch (e) {}
  try { await sql`ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0`; } catch (e) {}
  try { await sql`CREATE TABLE IF NOT EXISTS comment_likes ( comment_id INTEGER, author VARCHAR(255), PRIMARY KEY (comment_id, author) )`; } catch (e) {}
  try { await sql`ALTER TABLE comments ADD COLUMN image_data TEXT`; } catch (e) {} // 짤방 첨부용 창고 추가!

  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;

  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다 😭</div>;
  }

  const isAuthor = currentUser === post.author;
  const { rows: comments } = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at ASC`;

  // 🏆 베스트 댓글 추출 로직: 공감 3개 이상인 댓글들을 상단에 노출하기 위해 골라냅니다!
  const bestComments = comments.filter(c => c.likes >= 3).sort((a, b) => b.likes - a.likes).slice(0, 3);

  // 🌳 무한 트리 구조 만들기: 부모-자식 관계를 묶어줍니다.
  const buildTree = (allComments: any[], parentId: number | null = null): any[] => {
    return allComments
      .filter(c => c.parent_id === parentId || (parentId === null && !c.parent_id))
      .map(c => ({
        ...c,
        children: buildTree(allComments, c.id)
      }));
  };
  const commentTree = buildTree(comments, null);

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

  // --- ⚡ [액션] 댓글 & 대댓글 등록 (이미지 첨부 포함!) ---
  const addComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) redirect('/login');
    const content = formData.get('content') as string;
    const parentId = formData.get('parentId') as string;
    const imageFile = formData.get('image') as File;
    
    if (!content && (!imageFile || imageFile.size === 0)) return; // 글도 그림도 없으면 패스

    let imageData = null;
    // 이미지가 첨부되었다면 Base64로 변환하여 DB에 저장 (MVP 버전)
    if (imageFile && imageFile.size > 0 && imageFile.size <= 2 * 1024 * 1024) { // 2MB 제한
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      imageData = `data:${imageFile.type};base64,${base64}`;
    }

    if (parentId) {
      await sql`INSERT INTO comments (post_id, author, content, parent_id, image_data) VALUES (${postId}, ${currentUser}, ${content}, ${parentId}, ${imageData})`;
    } else {
      await sql`INSERT INTO comments (post_id, author, content, image_data) VALUES (${postId}, ${currentUser}, ${content}, ${imageData})`;
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

  // 🌳 재귀 함수를 이용해 무한 뎁스의 댓글 트리를 그리는 마법의 컴포넌트!
  const renderCommentNode = (node: any, depth: number = 0) => {
    const isReply = depth > 0;
    // 깊이가 깊어질수록 들여쓰기 적용 (최대 5단계까지만 들여쓰기해서 모바일 화면 깨짐 방지)
    const paddingLeft = isReply ? `${Math.min(depth * 1.5, 4)}rem` : '0';
    
    return (
      <div key={node.id} className="w-full">
        {/* 개별 댓글 디자인 */}
        <div 
          className={`p-4 border-b border-gray-100 relative group transition-colors ${isReply ? 'bg-gray-50/70' : 'bg-white'}`}
          style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '1rem' }}
        >
          {/* 대댓글 꺾쇠 (ㄴ 모양) */}
          {isReply && (
            <div className="absolute left-2 top-5 border-l-2 border-b-2 border-gray-300 w-3 h-3 rounded-bl-sm" style={{ left: `calc(${paddingLeft} - 0.5rem)` }}></div>
          )}
          
          <div className="flex justify-between items-start mb-2">
            <div className="font-bold text-gray-800 text-[13.5px] flex items-center gap-2">
              {node.author}
              {node.likes >= 3 && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] rounded-sm">베스트</span>}
            </div>
          </div>
          
          <div className="text-gray-800 text-[15px] mb-3 leading-relaxed break-words whitespace-pre-wrap">{node.content}</div>
          
          {/* 🖼️ 첨부된 이미지가 있으면 출력! */}
          {node.image_data && (
            <div className="mb-4">
              <img src={node.image_data} alt="첨부이미지" className="max-w-full md:max-w-md rounded-sm border border-gray-200 shadow-sm" />
            </div>
          )}
          
          {/* 하단 버튼 영역 (답글 / 공감) */}
          <div className="flex items-center gap-3">
            <label htmlFor={`reply-${node.id}`} className="cursor-pointer text-[13px] text-gray-500 font-bold hover:text-[#3b4890] flex items-center gap-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
              답글
            </label>
            
            <form action={toggleCommentLike}>
              <input type="hidden" name="commentId" value={node.id} />
              <button type="submit" className={`text-[13px] font-bold flex items-center gap-1 transition-colors ${node.likes > 0 ? 'text-rose-500 hover:text-rose-600' : 'text-gray-500 hover:text-rose-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                공감 {node.likes || 0}
              </button>
            </form>
          </div>
        </div>

        {/* 대댓글 작성 폼 (숨겨져 있다가 답글 누르면 열림) */}
        <input type="checkbox" id={`reply-${node.id}`} className="hidden peer" />
        <div className="hidden peer-checked:block bg-gray-100 p-4 border-b border-gray-200">
          {currentUser ? (
            <form action={addComment} className="flex flex-col gap-2" style={{ paddingLeft: `calc(1rem + ${paddingLeft})` }}>
              <input type="hidden" name="parentId" value={node.id} />
              <textarea name="content" placeholder={`@${node.author} 님에게 답글 남기기...`} className="w-full p-3 border border-gray-300 rounded-sm focus:border-[#3b4890] outline-none font-medium text-sm bg-white resize-none h-20" required />
              <div className="flex justify-between items-center bg-white border border-t-0 border-gray-300 p-2 rounded-b-sm -mt-2.5">
                <input type="file" name="image" accept="image/*" className="text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer" />
                <button type="submit" className="px-5 py-2 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-xs shadow-sm">등록</button>
              </div>
            </form>
          ) : (
            <div className="text-center text-gray-500 font-bold text-sm py-2">대댓글을 작성하려면 로그인해주세요.</div>
          )}
        </div>

        {/* 자식 댓글(대댓글)이 있으면 재귀적으로 파고 들어가며 렌더링! */}
        {node.children && node.children.length > 0 && (
          <div className="w-full">
            {node.children.map((child: any) => renderCommentNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

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
                <Link href={`/board/${postId}/edit`} className="flex-1 md:flex-none text-center px-6 py-2 bg-[#4b5563] text-white rounded-sm font-bold hover:bg-[#374151] transition-colors shadow-sm text-sm">수정</Link>
                <form action={deletePost} className="flex-1 md:flex-none">
                  <button type="submit" className="w-full px-6 py-2 bg-[#e06c75] text-white rounded-sm font-bold hover:bg-[#c95d66] transition-colors shadow-sm text-sm">삭제</button>
                </form>
              </>
            )}
          </div>
          <Link href={`/board?category=${postData.cat !== '일반' ? postData.cat : 'all'}`} className="w-full md:w-auto text-center px-8 py-2 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm shadow-sm">목록으로</Link>
        </div>

        {/* =========================================
            🏆 미나의 야심작: 푸르딩딩 베스트 댓글 영역 
            ========================================= */}
        {bestComments.length > 0 && (
          <div className="mt-16 bg-blue-50 border border-blue-200 rounded-sm overflow-hidden shadow-sm">
            <div className="bg-[#3b4890] px-5 py-2.5 text-white font-black text-[15px] flex items-center gap-2">
              🏆 명예의 전당 베스트 댓글
            </div>
            <div className="divide-y divide-blue-100">
              {bestComments.map((c) => (
                <div key={`best-${c.id}`} className="p-4 flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-800 text-[13.5px] mb-1.5 flex items-center gap-2">
                      {c.author}
                    </div>
                    <div className="text-gray-800 text-[15px] leading-relaxed break-words whitespace-pre-wrap">{c.content}</div>
                    {/* 베스트 댓글 내 짤방 노출 */}
                    {c.image_data && <img src={c.image_data} className="mt-3 max-w-full md:max-w-xs rounded-sm border border-blue-200" alt="베스트 짤방" />}
                  </div>
                  <div className="flex flex-col items-center bg-white border border-blue-200 rounded px-3 py-1.5 shadow-sm min-w-[60px]">
                    <span className="text-rose-500 text-sm">❤️</span>
                    <span className="text-[#3b4890] font-black text-sm">{c.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================
            💬 일반 댓글 트리 구조 영역
            ========================================= */}
        <div className={`bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm ${bestComments.length > 0 ? 'mt-8' : 'mt-16'}`}>
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-800">
              💬 전체 댓글 <span className="text-[#e74c3c] ml-1">{comments.length}</span>
            </h3>
          </div>

          <div className="flex flex-col">
            {commentTree.length === 0 ? (
              <div className="text-center text-gray-400 py-10 font-medium text-sm">아직 등록된 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</div>
            ) : (
              commentTree.map(node => renderCommentNode(node, 0))
            )}
          </div>

          {/* 메인 댓글 작성 폼 (가장 아래 배치, 첨부파일 포함) */}
          <div className="p-5 bg-gray-100 border-t border-gray-200">
            {currentUser ? (
              <form action={addComment} className="flex flex-col gap-0">
                <textarea name="content" placeholder="주제와 무관한 댓글이나 악플은 삭제될 수 있습니다. (우측 하단 첨부파일 클릭하여 짤방 등록 가능!)" className="w-full p-4 border border-gray-300 rounded-t-sm focus:border-[#3b4890] outline-none font-medium text-[14.5px] bg-white resize-none h-24" required />
                <div className="flex justify-between items-center bg-white border border-t-0 border-gray-300 p-2 rounded-b-sm">
                  <input type="file" name="image" accept="image/*" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-bold file:bg-[#f1f3f5] file:text-[#3b4890] hover:file:bg-gray-200 cursor-pointer" />
                  <button type="submit" className="w-24 py-2.5 bg-[#3b4890] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm shadow-sm">댓글 등록</button>
                </div>
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