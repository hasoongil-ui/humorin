// @ts-nocheck
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { PostLikeButton, CommentLikeButton, PostScrapButton } from './InteractiveButtons';
import CommentForm from './CommentForm';
import VideoVolumeFix from './VideoVolumeFix'; 

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
  const userIdCookie = cookieStore.get('ojemi_userid');  

  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;
  const isAdmin = currentUserId === 'admin';

  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;

  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다</div>;
  }

  const isAuthor = currentUserId === post.author_id || (!post.author_id && currentUser === post.author);
  const postData = extractData(post.title);

  // 💡 [핵심 마법 1] 통제실(DB)에서 전체 셧다운과 '이 게시판의 개별 셧다운' 상태를 가져옵니다!
  let isGlobalCommentLocked = false;
  let isBoardCommentLocked = false;
  try {
    const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'global_comment_lock'`;
    if (settings.length > 0 && settings[0].value === 'true') isGlobalCommentLocked = true;

    const { rows: boardLocks } = await sql`SELECT is_comment_locked FROM boards WHERE name = ${postData.cat}`;
    if (boardLocks.length > 0 && boardLocks[0].is_comment_locked) isBoardCommentLocked = true;
  } catch (e) {}

  // 관리자가 아니면서, (전체 잠금 OR 개별 잠금) 중 하나라도 걸려있으면 true!
  const isCommentLocked = (isGlobalCommentLocked || isBoardCommentLocked) && !isAdmin;

  const { rows: comments } = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at ASC`;
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
  let hasScrapped = false; 
  let userCommentLikes: number[] = [];
  
  if (currentUserId) {
    const { rows: likeRows } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
    if (likeRows.length > 0) hasLiked = true;

    try {
      const { rows: scrapRows } = await sql`SELECT * FROM scraps WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
      if (scrapRows.length > 0) hasScrapped = true;
    } catch (e) {}

    const { rows: clRows } = await sql`SELECT comment_id FROM comment_likes WHERE author_id = ${currentUserId}`;
    userCommentLikes = clRows.map(row => row.comment_id);
  }

  const deletePost = async () => {
    'use server';
    if (!isAdmin && !isAuthor) return; 
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    if (post.author_id) {
      await sql`UPDATE users SET points = GREATEST(COALESCE(points, 0) - 10, 0) WHERE user_id = ${post.author_id}`;
    }
    redirect('/board');
  };

  const toggleLike = async () => {
    'use server';
    if (!currentUserId) redirect('/login');
    const { rows: checkRows = [] } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
    const likePower = isAdmin ? 10 : 1; 

    if (checkRows.length > 0) {
      await sql`DELETE FROM likes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
      await sql`UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - ${likePower}, 0) WHERE id = ${postId}`;
      if (post.author_id) {
        await sql`UPDATE users SET points = GREATEST(COALESCE(points, 0) - 2, 0) WHERE user_id = ${post.author_id}`;
      }
    } else {
      await sql`INSERT INTO likes (post_id, author, author_id) VALUES (${postId}, ${currentUser}, ${currentUserId})`;
      await sql`UPDATE posts SET likes = COALESCE(likes, 0) + ${likePower} WHERE id = ${postId}`;
      if (post.author_id) {
        await sql`UPDATE users SET points = COALESCE(points, 0) + 2 WHERE user_id = ${post.author_id}`;
      }
    }
    revalidatePath(`/board/${postId}`);
  };

  const toggleScrap = async () => {
    'use server';
    if (!currentUserId) redirect('/login');
    const { rows: checkRows = [] } = await sql`SELECT * FROM scraps WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM scraps WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
    } else {
      await sql`INSERT INTO scraps (post_id, author, author_id) VALUES (${postId}, ${currentUser}, ${currentUserId})`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const addComment = async (formData: FormData) => {
    'use server';
    if (!currentUserId) return;

    // 💡 [핵심 마법 2] 뚫고 들어오려는 해커를 서버에서 한 번 더 차단하는 이중 방어막!
    let isActionLocked = false;
    try {
      const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'global_comment_lock'`;
      const { rows: boardLocks } = await sql`SELECT is_comment_locked FROM boards WHERE name = ${postData.cat}`;
      if ((settings[0]?.value === 'true' || boardLocks[0]?.is_comment_locked) && !isAdmin) {
        isActionLocked = true;
      }
    } catch (e) {}
    
    // 잠겼으면 아무것도 못하게 튕겨냄
    if (isActionLocked) return;

    const content = (formData.get('content') as string) || ''; 
    const parentId = formData.get('parentId') as string;
    const imageUrl = formData.get('imageUrl') as string;
    if (!content.trim() && !imageUrl) return; 

    if (parentId) {
      await sql`INSERT INTO comments (post_id, author, author_id, content, parent_id, image_data) VALUES (${postId}, ${currentUser}, ${currentUserId}, ${content}, ${parentId}, ${imageUrl || null})`;
    } else {
      await sql`INSERT INTO comments (post_id, author, author_id, content, image_data) VALUES (${postId}, ${currentUser}, ${currentUserId}, ${content}, ${imageUrl || null})`;
    }
    await sql`UPDATE users SET points = COALESCE(points, 0) + 5 WHERE user_id = ${currentUserId}`;
    revalidatePath(`/board/${postId}`);
  };

  const deleteComment = async (formData: FormData) => {
    'use server';
    if (!currentUserId) return;
    const commentId = formData.get('commentId') as string;
    const { rows = [] } = await sql`SELECT author_id, author FROM comments WHERE id = ${commentId}`;
    if (rows.length > 0) {
      const commentAuthorId = rows[0].author_id;
      if (isAdmin || commentAuthorId === currentUserId) {
        await sql`DELETE FROM comments WHERE id = ${commentId}`;
        if (commentAuthorId) {
          await sql`UPDATE users SET points = GREATEST(COALESCE(points, 0) - 5, 0) WHERE user_id = ${commentAuthorId}`;
        }
      }
    }
    revalidatePath(`/board/${postId}`);
  };

  const toggleCommentLike = async (formData: FormData) => {
    'use server';
    if (!currentUserId) return;
    const commentId = formData.get('commentId') as string;
    const { rows: checkRows = [] } = await sql`SELECT * FROM comment_likes WHERE comment_id = ${commentId} AND author_id = ${currentUserId}`;
    const likePower = isAdmin ? 10 : 1;

    const { rows: commentRows = [] } = await sql`SELECT author_id FROM comments WHERE id = ${commentId}`;
    const commentAuthorId = commentRows[0]?.author_id;

    if (checkRows.length > 0) {
      await sql`DELETE FROM comment_likes WHERE comment_id = ${commentId} AND author_id = ${currentUserId}`;
      await sql`UPDATE comments SET likes = GREATEST(COALESCE(likes, 0) - ${likePower}, 0) WHERE id = ${commentId}`;
      if (commentAuthorId) {
        await sql`UPDATE users SET points = GREATEST(COALESCE(points, 0) - 2, 0) WHERE user_id = ${commentAuthorId}`;
      }
    } else {
      await sql`INSERT INTO comment_likes (comment_id, author, author_id) VALUES (${commentId}, ${currentUser}, ${currentUserId})`;
      await sql`UPDATE comments SET likes = COALESCE(likes, 0) + ${likePower} WHERE id = ${commentId}`;
      if (commentAuthorId) {
        await sql`UPDATE users SET points = COALESCE(points, 0) + 2 WHERE user_id = ${commentAuthorId}`;
      }
    }
    revalidatePath(`/board/${postId}`);
  };

  const renderCommentNode = (node: any, depth: number = 0) => {
    const isReply = depth > 0;
    const paddingLeft = isReply ? `${Math.min(depth * 1.5, 4)}rem` : '0';
    const isCommentAuthor = currentUserId === node.author_id || (!node.author_id && currentUser === node.author);
    const canDeleteComment = isCommentAuthor || isAdmin; 
    const hasUserLikedComment = userCommentLikes.includes(node.id);
    
    return (
      <div key={node.id} className="w-full">
        <div className={`p-4 border-b border-gray-100 relative group ${isReply ? 'bg-gray-50/70' : 'bg-white'}`} style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '1rem' }}>
          <div className="flex justify-between items-start mb-2">
            <div className="font-bold text-[13.5px] flex items-center gap-2">
              {node.author_id ? (
                <Link href={`/user/${node.author_id}`} className="hover:text-[#3b4890] hover:underline cursor-pointer transition-colors">
                  {node.author}
                </Link>
              ) : (
                <span>{node.author}</span>
              )}
              {node.likes >= 3 && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] rounded-sm">베스트</span>}
            </div>
            {canDeleteComment && (
              <form action={deleteComment}>
                <input type="hidden" name="commentId" value={node.id} />
                <button type="submit" className="text-xs text-red-500">삭제</button>
              </form>
            )}
          </div>
          <div className="text-[15px] mb-3 whitespace-pre-wrap">{node.content}</div>
          {node.image_data && <div className="mb-4"><img src={node.image_data} alt="첨부" className="max-w-md rounded-sm border" /></div>}
          <div className="flex items-center gap-3">
            {/* 💡 [핵심 마법 3] 잠겼으면 기존 댓글에 대댓글(답글)도 못 달게 숨깁니다! */}
            {!isCommentLocked && (
              <label htmlFor={`reply-${node.id}`} className="cursor-pointer text-[13px] text-gray-500 font-bold hover:text-[#3b4890]">답글</label>
            )}
            <CommentLikeButton commentId={node.id} initialLikes={node.likes || 0} initialHasLiked={hasUserLikedComment} toggleAction={toggleCommentLike} isAdmin={isAdmin} />
          </div>
        </div>
        
        {/* 대댓글 폼 렌더링 영역 */}
        <input type="checkbox" id={`reply-${node.id}`} className="hidden peer" />
        <div className="hidden peer-checked:block bg-gray-100 p-3">
          {!isCommentLocked && currentUser && <CommentForm postId={postId} parentId={node.id} author={node.author} actionType="reply" submitAction={addComment} />}
        </div>
        
        {node.children && node.children.map((child: any) => renderCommentNode(child, depth + 1))}
      </div>
    );
  };

  let finalContent = post.content || '';
  if (finalContent) {
    finalContent = finalContent.replace(
      /<video([^>]*)src="([^"]+)"([^>]*)>/gi,
      (match, beforeSrc, srcUrl, afterSrc) => {
        const newSrc = srcUrl.includes('#t=') ? srcUrl : `${srcUrl}#t=0.001`;
        return `<video controls="true" preload="metadata" playsinline="true" muted="true" src="${newSrc}">`;
      }
    );

    finalContent = finalContent.replace(
      /src="([^"]*youtube\.com\/embed\/[^"]*)"/gi,
      (match, srcUrl) => {
        try {
          const url = new URL(srcUrl.startsWith('http') ? srcUrl : `https:${srcUrl}`);
          url.searchParams.set('mute', '1');
          url.searchParams.set('enablejsapi', '1'); 
          return `src="${url.toString()}"`;
        } catch(e) {
          return match;
        }
      }
    );
  }

  return (
    <div className="bg-white font-sans rounded-sm shadow-sm border border-gray-200 relative">
      <VideoVolumeFix />
      <style>{`
        .ql-editor img { display: block; max-width: 100%; height: auto; border-radius: 8px; }
        .ql-editor iframe.ql-video, .ql-editor video { display: block; width: 100%; aspect-ratio: 16 / 9; height: auto; border-radius: 8px; background-color: #000; }
        .ql-editor p { min-height: 1.5em; }
        .ql-editor p br { display: block; }
      `}</style>

      {isAdmin && (
        <div className="bg-red-600 text-white text-center py-2 text-sm font-black tracking-wide shadow-md sticky top-0 z-[9999]">
          👑 최고 관리자(admin) 모드로 접속 중입니다.
        </div>
      )}
      <main className="max-w-[1000px] mx-auto p-5 md:p-8 mt-4 mb-20 overflow-hidden">
        <div className="border-b-2 border-gray-800 pb-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-black mb-4"><span className="text-[#3b4890] mr-2">[{postData.cat}]</span>{postData.cleanTitle}</h1>
          <div className="flex justify-between text-gray-500 text-sm font-bold">
            <div className="flex items-center gap-2">
              {post.author_id ? (
                <Link href={`/user/${post.author_id}`} className="hover:text-[#3b4890] hover:underline cursor-pointer transition-colors">
                  {post.author}
                </Link>
              ) : (
                <span>{post.author}</span>
              )}
              {isAdmin && <span className="bg-yellow-100 text-yellow-700 text-[11px] px-1 rounded-sm">Admin</span>}
            </div>
            <div className="text-rose-500">공감 {post.likes || 0}</div>
          </div>
        </div>
        
        <div className="min-h-[300px] text-[17px] whitespace-pre-wrap leading-relaxed ql-editor" dangerouslySetInnerHTML={{ __html: finalContent }} />
        
        <div className="mt-16 flex justify-center gap-3 border-t pt-10">
          <PostLikeButton postId={postId} initialLikes={post.likes || 0} initialHasLiked={hasLiked} toggleAction={toggleLike} isAdmin={isAdmin} />
          <PostScrapButton postId={postId} initialHasScrapped={hasScrapped} toggleScrapAction={toggleScrap} />
        </div>
        
        <div className="mt-12 border-t pt-6 flex justify-between">
          <div className="flex gap-2">
            {isAuthor && <Link href={`/board/${postId}/edit`} className="px-6 py-2 border font-bold text-sm">수정</Link>}
            {(isAuthor || isAdmin) && (
              <form action={deletePost}><button type="submit" className="px-6 py-2 bg-[#e06c75] text-white font-bold text-sm">삭제</button></form>
            )}
          </div>
          <Link href={`/board`} className="px-8 py-2 bg-[#414a66] text-white font-bold text-sm">목록으로</Link>
        </div>

        <div className="mt-16 bg-gray-50 p-5 border">
           <h3 className="font-bold">댓글 <span className="text-[#e74c3c]">{comments.length}</span></h3>
           
           <div className="mt-4">{commentTree.map(node => renderCommentNode(node, 0))}</div>
           
           <div className="mt-6">
             {/* 💡 [핵심 마법 4] 잠겼을 때 폼을 빼앗고 🔒 자물쇠 경고를 띄웁니다! */}
             {isCommentLocked ? (
               <div className="p-6 bg-gray-200/50 border border-gray-300 text-center font-bold text-[15px] text-gray-500 rounded-sm flex flex-col items-center justify-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-gray-400 mb-1"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                 현재 관리자에 의해 이 게시판의 댓글 작성이 금지되었습니다.
               </div>
             ) : currentUser ? (
               <CommentForm postId={postId} actionType="main" submitAction={addComment} />
             ) : (
               <div className="p-4 bg-white border border-gray-200 text-center font-bold text-sm text-gray-500 rounded-sm shadow-sm">로그인이 필요합니다.</div>
             )}
           </div>
        </div>
      </main>
    </div>
  );
}