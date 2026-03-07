import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import CommentScript from './CommentScript';

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

  try { await sql`ALTER TABLE comments ADD COLUMN parent_id INTEGER`; } catch (e) {}
  try { await sql`ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0`; } catch (e) {}
  try { await sql`CREATE TABLE IF NOT EXISTS comment_likes ( comment_id INTEGER, author VARCHAR(255), PRIMARY KEY (comment_id, author) )`; } catch (e) {}
  try { await sql`ALTER TABLE comments ADD COLUMN image_data TEXT`; } catch (e) {} 

  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;

  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다</div>;
  }

  const isAuthor = currentUser === post.author;
  const { rows: comments } = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at ASC`;

  const bestComments = comments.filter(c => c.likes >= 3).sort((a, b) => b.likes - a.likes).slice(0, 3);

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

  const deletePost = async () => {
    'use server';
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    redirect('/board');
  };

  const toggleLike = async () => {
    'use server';
    if (!currentUser) redirect('/login');
    const { rows: checkRows = [] } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
    
    if (checkRows.length > 0) {
      await sql`DELETE FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
      await sql`UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${postId}`;
    } else {
      await sql`INSERT INTO likes (post_id, author) VALUES (${postId}, ${currentUser})`;
      await sql`UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE id = ${postId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const addComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) redirect('/login');
    // 💡 미나의 개선: 글씨가 비어있어도 이미지만 있으면 통과되도록 방어막 조정!
    const content = (formData.get('content') as string) || ''; 
    const parentId = formData.get('parentId') as string;
    const imageFile = formData.get('image') as File;
    
    if (!content.trim() && (!imageFile || imageFile.size === 0)) return; 

    let imageData = null;
    if (imageFile && imageFile.size > 0 && imageFile.size <= 1 * 1024 * 1024) { 
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageData = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
    }

    if (parentId) {
      await sql`INSERT INTO comments (post_id, author, content, parent_id, image_data) VALUES (${postId}, ${currentUser}, ${content}, ${parentId}, ${imageData})`;
    } else {
      await sql`INSERT INTO comments (post_id, author, content, image_data) VALUES (${postId}, ${currentUser}, ${content}, ${imageData})`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const deleteComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) redirect('/login');
    const commentId = formData.get('commentId') as string;
    
    const { rows = [] } = await sql`SELECT author FROM comments WHERE id = ${commentId}`;
    if (rows.length > 0 && rows[0].author === currentUser) {
      await sql`DELETE FROM comments WHERE id = ${commentId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const editComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) redirect('/login');
    const commentId = formData.get('commentId') as string;
    const content = (formData.get('content') as string) || '';
    const imageFile = formData.get('image') as File;
    const removeExistingImage = formData.get('removeExistingImage') === 'true'; // 삭제 플래그 수신

    const { rows = [] } = await sql`SELECT author, image_data FROM comments WHERE id = ${commentId}`;
    if (rows.length > 0 && rows[0].author === currentUser) {
      let imageData = null;
      let hasNewImage = false;

      if (imageFile && imageFile.size > 0 && imageFile.size <= 1 * 1024 * 1024) { 
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imageData = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
        hasNewImage = true;
      }

      // 글과 사진이 모두 날아가는 완전 빈 깡통 댓글 방지
      const finalImage = hasNewImage ? imageData : (removeExistingImage ? null : rows[0].image_data);
      if (!content.trim() && !finalImage) return;

      // 새 이미지가 있으면 덮어쓰고, 삭제 플래그가 켜졌으면 사진 칸을 NULL(비움) 처리!
      if (hasNewImage) {
        await sql`UPDATE comments SET content = ${content}, image_data = ${imageData} WHERE id = ${commentId}`;
      } else if (removeExistingImage) {
        await sql`UPDATE comments SET content = ${content}, image_data = NULL WHERE id = ${commentId}`;
      } else {
        await sql`UPDATE comments SET content = ${content} WHERE id = ${commentId}`;
      }
    }
    revalidatePath(`/board/${postId}`);
  };

  const toggleCommentLike = async (formData: FormData) => {
    'use server';
    if (!currentUser) redirect('/login');
    const commentId = formData.get('commentId') as string;
    
    const { rows: checkRows = [] } = await sql`SELECT * FROM comment_likes WHERE comment_id = ${commentId} AND author = ${currentUser}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM comment_likes WHERE comment_id = ${commentId} AND author = ${currentUser}`;
      await sql`UPDATE comments SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${commentId}`;
    } else {
      await sql`INSERT INTO comment_likes (comment_id, author) VALUES (${commentId}, ${currentUser})`;
      await sql`UPDATE comments SET likes = COALESCE(likes, 0) + 1 WHERE id = ${commentId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const renderCommentNode = (node: any, depth: number = 0) => {
    const isReply = depth > 0;
    const paddingLeft = isReply ? `${Math.min(depth * 1.5, 4)}rem` : '0';
    const isCommentAuthor = currentUser === node.author;
    
    return (
      <div key={node.id} className="w-full">
        <div 
          className={`p-4 border-b border-gray-100 relative group transition-colors ${isReply ? 'bg-gray-50/70' : 'bg-white'}`}
          style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '1rem' }}
        >
          {isReply && (
            <div className="absolute left-2 top-5 border-l-2 border-b-2 border-gray-300 w-3 h-3 rounded-bl-sm" style={{ left: `calc(${paddingLeft} - 0.5rem)` }}></div>
          )}
          
          <div className="flex justify-between items-start mb-2">
            <div className="font-bold text-gray-800 text-[13.5px] flex items-center gap-2">
              {node.author}
              {node.likes >= 3 && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] rounded-sm">베스트</span>}
            </div>
            {isCommentAuthor && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <label htmlFor={`edit-${node.id}`} className="cursor-pointer px-2.5 py-1 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm font-medium">수정</label>
                <form action={deleteComment}>
                  <input type="hidden" name="commentId" value={node.id} />
                  <button type="submit" className="px-2.5 py-1 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 hover:text-red-500 transition-colors shadow-sm font-medium">삭제</button>
                </form>
              </div>
            )}
          </div>
          
          <div className="text-gray-800 text-[15px] mb-3 leading-relaxed break-words whitespace-pre-wrap">{node.content}</div>
          
          {node.image_data && (
            <div className="mb-4">
              <img src={node.image_data} alt="첨부이미지" className="max-w-full md:max-w-md rounded-sm border border-gray-200 shadow-sm" />
            </div>
          )}
          
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

        <div className="w-full">
          <input type="checkbox" id={`reply-${node.id}`} className="hidden peer" />
          <div className="hidden peer-checked:block bg-gray-100 p-3 sm:p-4 border-b border-gray-200">
            {currentUser ? (
              <form action={addComment} className="flex flex-col gap-0" style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '0' }} data-checkbox-id={`reply-${node.id}`}>
                <input type="hidden" name="parentId" value={node.id} />
                {/* 💡 required 삭제 완료! 이제 텍스트 안 적어도 전송 가능 */}
                <textarea name="content" placeholder="답글 남기기" className="w-full p-3 border border-gray-300 rounded-t-sm focus:border-[#3b4890] outline-none font-medium text-sm bg-white resize-none h-20" />
                
                <div id={`preview-file-reply-${node.id}`} className="hidden bg-white border-x border-gray-300 px-3 pb-2 pt-1">
                  <div className="relative inline-block bg-gray-50 p-2 rounded-sm border border-gray-200">
                    <img id={`img-preview-file-reply-${node.id}`} className="max-h-20 object-contain rounded-sm" alt="미리보기" />
                    <button type="button" data-input-id={`file-reply-${node.id}`} className="remove-image-btn absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 p-1 hover:bg-gray-100 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-gray-500"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-t-0 border-gray-300 p-2 rounded-b-sm gap-2 sm:gap-0">
                  <div className="w-full sm:w-auto flex items-center gap-2">
                    <input type="file" id={`file-reply-${node.id}`} name="image" accept="image/*" className="image-upload-input sr-only" />
                    <label htmlFor={`file-reply-${node.id}`} className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-sm text-xs font-bold text-gray-600 transition-colors shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                      이미지 첨부 (1MB 이하)
                    </label>
                  </div>
                  <button type="submit" className="w-full sm:w-20 py-2 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-xs shadow-sm flex-shrink-0">등록</button>
                </div>
              </form>
            ) : (
              <div className="text-center text-gray-500 font-bold text-sm py-2">대댓글을 작성하려면 로그인해주세요.</div>
            )}
          </div>
        </div>

        {/* 💡 기존 댓글 수정 폼 */}
        {isCommentAuthor && (
          <div className="w-full">
            <input type="checkbox" id={`edit-${node.id}`} className="hidden peer" />
            <div className="hidden peer-checked:block bg-gray-100 p-3 sm:p-4 border-b border-gray-200">
              {/* 💡 기존 이미지를 복구할 수 있도록 폼 태그에 원본 이미지 주소를 달아둡니다! */}
              <form action={editComment} className="flex flex-col gap-0" style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '0' }} data-checkbox-id={`edit-${node.id}`} data-original-image={node.image_data || ''}>
                <input type="hidden" name="commentId" value={node.id} />
                {/* 💡 숨겨진 지우개 플래그: 이 값이 true가 되면 서버가 DB에서 사진을 완전히 날려버립니다 */}
                <input type="hidden" name="removeExistingImage" id={`remove-image-flag-${node.id}`} value="false" />
                
                {/* 💡 required 삭제 완료! */}
                <textarea name="content" defaultValue={node.content} className="w-full p-3 border border-gray-300 rounded-t-sm focus:border-gray-600 outline-none font-medium text-sm bg-white resize-none h-20" />
                
                {/* 💡 수정창 열었을 때 기존 이미지가 있으면 즉시 띄워주는 로직 탑재! */}
                <div id={`preview-file-edit-${node.id}`} className={`bg-white border-x border-gray-300 px-3 pb-2 pt-1 ${node.image_data ? '' : 'hidden'}`}>
                  <div className="relative inline-block bg-gray-50 p-2 rounded-sm border border-gray-200">
                    <img id={`img-preview-file-edit-${node.id}`} src={node.image_data || undefined} className="max-h-20 object-contain rounded-sm" alt="미리보기" />
                    <button type="button" data-input-id={`file-edit-${node.id}`} data-node-id={node.id} className="remove-image-btn absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 p-1 hover:bg-gray-100 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-gray-500"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-t-0 border-gray-300 p-2 rounded-b-sm gap-2 sm:gap-0">
                  <div className="w-full sm:w-auto flex items-center gap-2">
                    <input type="file" id={`file-edit-${node.id}`} name="image" accept="image/*" className="image-upload-input sr-only" />
                    <label htmlFor={`file-edit-${node.id}`} className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-sm text-xs font-bold text-gray-600 transition-colors shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                      이미지 변경 (1MB 이하)
                    </label>
                  </div>
                  <button type="submit" className="w-full sm:w-20 py-2 bg-gray-600 text-white rounded-sm font-bold hover:bg-gray-800 transition-colors text-xs shadow-sm flex-shrink-0">수정완료</button>
                </div>
              </form>
            </div>
          </div>
        )}

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
              <span className="text-rose-500 font-bold">공감 {post.likes || 0}</span>
            </div>
          </div>
        </div>

        <div 
          className="min-h-[200px] md:min-h-[400px] text-gray-900 text-base md:text-[17px] whitespace-pre-wrap leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

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

        {bestComments.length > 0 && (
          <div className="mt-16 bg-blue-50 border border-blue-200 rounded-sm overflow-hidden shadow-sm">
            <div className="bg-[#3b4890] px-5 py-2.5 text-white font-black text-[15px] flex items-center gap-2">
              명예의 전당 베스트 댓글
            </div>
            <div className="divide-y divide-blue-100">
              {bestComments.map((c) => (
                <div key={`best-${c.id}`} className="p-4 flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-800 text-[13.5px] mb-1.5 flex items-center gap-2">
                      {c.author}
                    </div>
                    <div className="text-gray-800 text-[15px] leading-relaxed break-words whitespace-pre-wrap">{c.content}</div>
                    {c.image_data && <img src={c.image_data} className="mt-3 max-w-full md:max-w-xs rounded-sm border border-blue-200" alt="베스트 이미지" />}
                  </div>
                  <div className="flex flex-col items-center bg-white border border-blue-200 rounded px-3 py-1.5 shadow-sm min-w-[60px]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-rose-500 mb-1"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                    <span className="text-[#3b4890] font-black text-sm">{c.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm ${bestComments.length > 0 ? 'mt-8' : 'mt-16'}`}>
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-800">
              전체 댓글 <span className="text-[#e74c3c] ml-1">{comments.length}</span>
            </h3>
          </div>

          <div className="flex flex-col">
            {commentTree.length === 0 ? (
              <div className="text-center text-gray-400 py-10 font-medium text-sm">아직 등록된 댓글이 없습니다. 첫 번째 댓글을 남겨보세요.</div>
            ) : (
              commentTree.map(node => renderCommentNode(node, 0))
            )}
          </div>

          {/* 메인 댓글 작성 폼 */}
          <div className="p-3 sm:p-5 bg-gray-100 border-t border-gray-200">
            {currentUser ? (
              <form action={addComment} id="main-comment-form" className="flex flex-col gap-0">
                {/* 💡 required 삭제 완료! */}
                <textarea name="content" placeholder="건전한 커뮤니티 문화를 위해 배려 부탁드립니다." className="w-full p-3 sm:p-4 border border-gray-300 rounded-t-sm focus:border-[#3b4890] outline-none font-medium text-[14px] bg-white resize-none h-20 sm:h-24" />
                
                <div id="preview-file-comment-main" className="hidden bg-white border-x border-gray-300 px-3 pb-2 pt-1">
                  <div className="relative inline-block bg-gray-50 p-2 rounded-sm border border-gray-200">
                    <img id="img-preview-file-comment-main" className="max-h-20 object-contain rounded-sm" alt="미리보기" />
                    <button type="button" data-input-id="file-comment-main" className="remove-image-btn absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 p-1 hover:bg-gray-100 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-gray-500"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-t-0 border-gray-300 p-2 rounded-b-sm gap-2 sm:gap-0">
                  <div className="w-full sm:w-auto flex items-center gap-2">
                    <input type="file" id="file-comment-main" name="image" accept="image/*" className="image-upload-input sr-only" />
                    <label htmlFor="file-comment-main" className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-sm text-xs font-bold text-gray-600 transition-colors shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                      이미지 첨부 (1MB 이하)
                    </label>
                  </div>
                  <button type="submit" className="w-full sm:w-24 py-2.5 bg-[#3b4890] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm shadow-sm flex-shrink-0">댓글 등록</button>
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
      
      <CommentScript />
    </div>
  );
}