// @ts-nocheck
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { PostLikeButton, CommentLikeButton, PostScrapButton, PostReportButton, CommentReportButton } from './InteractiveButtons';
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
  
  let isAdmin = currentUserId === 'admin';
  if (currentUserId && !isAdmin) {
    try {
      const { rows: adminRows } = await sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (adminRows.length > 0 && adminRows[0].is_admin) {
        isAdmin = true;
      }
    } catch (e) {}
  }

  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;

  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다</div>;
  }

  const isAuthor = currentUserId === post.author_id || (!post.author_id && currentUser === post.author);
  const postData = extractData(post.title);

  let isGlobalCommentLocked = false;
  let isBoardCommentLocked = false;
  try {
    const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'global_comment_lock'`;
    if (settings.length > 0 && settings[0].value === 'true') isGlobalCommentLocked = true;

    const { rows: boardLocks } = await sql`SELECT is_comment_locked FROM boards WHERE name = ${postData.cat}`;
    if (boardLocks.length > 0 && boardLocks[0].is_comment_locked) isBoardCommentLocked = true;
  } catch (e) {}

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
    
    // 💡 [핵심 마법 1] 관리자가 슈퍼파워(+10)를 쓸 때도 승급 시계를 확인하고 도장을 찍습니다!
    if (isAdmin) {
      await sql`
        UPDATE posts 
        SET 
          likes = COALESCE(likes, 0) + 10,
          best_at = CASE WHEN COALESCE(likes, 0) + 10 >= 10 AND best_at IS NULL THEN CURRENT_TIMESTAMP ELSE best_at END,
          best100_at = CASE WHEN COALESCE(likes, 0) + 10 >= 100 AND best100_at IS NULL THEN CURRENT_TIMESTAMP ELSE best100_at END,
          best1000_at = CASE WHEN COALESCE(likes, 0) + 10 >= 1000 AND best1000_at IS NULL THEN CURRENT_TIMESTAMP ELSE best1000_at END
        WHERE id = ${postId}
      `;
      revalidatePath(`/board/${postId}`);
      return;
    }

    const { rows: checkRows = [] } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM likes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
      await sql`UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${postId}`;
      if (post.author_id) {
        await sql`UPDATE users SET points = GREATEST(COALESCE(points, 0) - 2, 0) WHERE user_id = ${post.author_id}`;
      }
    } else {
      await sql`INSERT INTO likes (post_id, author, author_id) VALUES (${postId}, ${currentUser}, ${currentUserId})`;
      // 💡 [핵심 마법 2] 일반 유저가 공감을 눌러서 승급 기준을 넘으면 현재 시간(CURRENT_TIMESTAMP)을 찍습니다!
      await sql`
        UPDATE posts 
        SET 
          likes = COALESCE(likes, 0) + 1,
          best_at = CASE WHEN COALESCE(likes, 0) + 1 >= 10 AND best_at IS NULL THEN CURRENT_TIMESTAMP ELSE best_at END,
          best100_at = CASE WHEN COALESCE(likes, 0) + 1 >= 100 AND best100_at IS NULL THEN CURRENT_TIMESTAMP ELSE best100_at END,
          best1000_at = CASE WHEN COALESCE(likes, 0) + 1 >= 1000 AND best1000_at IS NULL THEN CURRENT_TIMESTAMP ELSE best1000_at END
        WHERE id = ${postId}
      `;
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

    let isActionLocked = false;
    try {
      const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'global_comment_lock'`;
      const { rows: boardLocks } = await sql`SELECT is_comment_locked FROM boards WHERE name = ${postData.cat}`;
      if ((settings[0]?.value === 'true' || boardLocks[0]?.is_comment_locked) && !isAdmin) {
        isActionLocked = true;
      }
    } catch (e) {}
    
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
    
    if (isAdmin) {
      await sql`UPDATE comments SET likes = COALESCE(likes, 0) + 10 WHERE id = ${commentId}`;
      revalidatePath(`/board/${postId}`);
      return;
    }

    const { rows: checkRows = [] } = await sql`SELECT * FROM comment_likes WHERE comment_id = ${commentId} AND author_id = ${currentUserId}`;
    const { rows: commentRows = [] } = await sql`SELECT author_id FROM comments WHERE id = ${commentId}`;
    const commentAuthorId = commentRows[0]?.author_id;

    if (checkRows.length > 0) {
      await sql`DELETE FROM comment_likes WHERE comment_id = ${commentId} AND author_id = ${currentUserId}`;
      await sql`UPDATE comments SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${commentId}`;
      if (commentAuthorId) {
        await sql`UPDATE users SET points = GREATEST(COALESCE(points, 0) - 2, 0) WHERE user_id = ${commentAuthorId}`;
      }
    } else {
      await sql`INSERT INTO comment_likes (comment_id, author, author_id) VALUES (${commentId}, ${currentUser}, ${currentUserId})`;
      await sql`UPDATE comments SET likes = COALESCE(likes, 0) + 1 WHERE id = ${commentId}`;
      if (commentAuthorId) {
        await sql`UPDATE users SET points = COALESCE(points, 0) + 2 WHERE user_id = ${commentAuthorId}`;
      }
    }
    revalidatePath(`/board/${postId}`);
  };

  const grantPostImmunity = async () => {
    'use server';
    if (!isAdmin) return;
    await sql`UPDATE posts SET is_blinded = false, is_safe = true, report_count = 0 WHERE id = ${postId}`;
    revalidatePath(`/board/${postId}`);
  };

  const grantCommentImmunity = async (formData: FormData) => {
    'use server';
    if (!isAdmin) return;
    const commentId = formData.get('commentId') as string;
    await sql`UPDATE comments SET is_blinded = false, is_safe = true, report_count = 0 WHERE id = ${commentId}`;
    revalidatePath(`/board/${postId}`);
  };

  const renderCommentNode = (node: any, depth: number = 0) => {
    const isReply = depth > 0;
    const paddingLeft = isReply ? `${Math.min(depth * 1.5, 4)}rem` : '0';
    const isCommentAuthor = currentUserId === node.author_id || (!node.author_id && currentUser === node.author);
    const canDeleteComment = isCommentAuthor || isAdmin; 
    const hasUserLikedComment = userCommentLikes.includes(node.id);
    
    let bgColorClass = isReply ? 'bg-gray-50/70' : 'bg-white';
    let badge = null;
    
    if (node.likes >= 30) {
      bgColorClass = 'bg-green-100/40 border-green-300';
      badge = <span className="px-2 py-0.5 bg-green-500 text-white text-[11px] rounded-full shadow-sm font-black tracking-wide">🌳 오재미 숲 성지</span>;
    } else if (node.likes >= 10) {
      bgColorClass = 'bg-emerald-50 border-emerald-200';
      badge = <span className="px-2 py-0.5 bg-emerald-500 text-white text-[11px] rounded-full shadow-sm font-bold">🌲 튼튼한 나무</span>;
    } else if (node.likes >= 3) {
      bgColorClass = 'bg-blue-50/60 border-blue-200';
      badge = <span className="px-2 py-0.5 bg-blue-400 text-white text-[11px] rounded-full shadow-sm font-bold">🌱 공감 새싹</span>;
    }

    return (
      <div key={node.id} className="w-full">
        <div className={`p-4 border-b border-gray-100 relative group transition-colors duration-300 ${bgColorClass}`} style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '1rem' }}>
          
          {node.is_safe && isAdmin && (
            <div className="absolute top-0 right-4 -mt-2.5 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-sm border border-gray-200 shadow-sm">
              🛡️ 면역 처리됨
            </div>
          )}

          <div className="flex justify-between items-start mb-2 mt-1">
            <div className="font-bold text-[13.5px] flex items-center gap-2">
              {node.author_id ? (
                <Link href={`/user/${node.author_id}`} className="hover:text-[#3b4890] hover:underline cursor-pointer transition-colors">
                  {node.author}
                </Link>
              ) : (
                <span>{node.author}</span>
              )}
              {badge}
            </div>
            {canDeleteComment && (
              <form action={deleteComment}>
                <input type="hidden" name="commentId" value={node.id} />
                <button type="submit" className="text-xs text-red-500 hover:underline">삭제</button>
              </form>
            )}
          </div>

          {node.is_blinded && !isAdmin ? (
            <div className="text-[14px] mb-3 text-gray-500 italic bg-gray-100 p-3 rounded-md border border-gray-300 shadow-inner flex items-center gap-2">
              <span className="text-lg">🚨</span> 유저 신고 누적으로 블라인드 처리된 댓글입니다.
            </div>
          ) : (
            <>
              {node.is_blinded && isAdmin && (
                <div className="text-[12px] mb-2 font-bold text-red-600 bg-red-50 p-2 rounded-sm border border-red-200 flex items-center justify-between shadow-sm">
                  <span>🚨 [관리자 알림] 블라인드 처리된 댓글입니다.</span>
                  <form action={grantCommentImmunity}>
                    <input type="hidden" name="commentId" value={node.id} />
                    <button type="submit" className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-sm hover:bg-red-700 transition-colors shadow-sm">
                      🛡️ 복구 및 면역
                    </button>
                  </form>
                </div>
              )}
              <div className="text-[15px] mb-3 whitespace-pre-wrap text-gray-800">{node.content}</div>
              {node.image_data && <div className="mb-4"><img src={node.image_data} alt="첨부" className="max-w-md rounded-sm border shadow-sm" /></div>}
            </>
          )}

          <div className="flex items-center gap-3">
            {!isCommentLocked && (
              <label htmlFor={`reply-${node.id}`} className="cursor-pointer text-[13px] text-gray-500 font-bold hover:text-[#3b4890]">답글</label>
            )}
            <CommentLikeButton commentId={node.id} initialLikes={node.likes || 0} initialHasLiked={hasUserLikedComment} toggleAction={toggleCommentLike} isAdmin={isAdmin} />
            <CommentReportButton commentId={node.id} currentUserId={currentUserId} isAdmin={isAdmin} />
          </div>
        </div>
        
        <input type="checkbox" id={`reply-${node.id}`} className="hidden peer" />
        <div className="hidden peer-checked:block bg-gray-100 p-3 border-b border-gray-200">
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
          👑 관리자 모드 접속 중
        </div>
      )}
      <main className="max-w-[1000px] mx-auto p-5 md:p-8 mt-4 mb-20 overflow-hidden">
        
        {post.is_safe && isAdmin && (
          <div className="mb-4 inline-block bg-gray-100 text-gray-500 text-[11px] font-bold px-3 py-1 rounded-sm border border-gray-200 shadow-sm">
            🛡️ [관리자 알림] 악성 신고 면역이 부여된 게시글입니다.
          </div>
        )}

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
        
        {post.is_blinded && !isAdmin ? (
          <div className="bg-gray-100 p-12 text-center rounded-lg border border-gray-300 my-10 shadow-inner">
            <span className="text-5xl mb-4 block">🚨</span>
            <p className="text-gray-600 font-bold text-lg leading-relaxed">
              유저들의 신고 누적으로<br/>임시 비공개 처리된 게시글입니다.
            </p>
          </div>
        ) : (
          <div className="post-content-area">
            {post.is_blinded && isAdmin && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 font-bold rounded-lg border border-red-300 flex items-center justify-between shadow-sm">
                <span>🚨 [관리자 알림] 신고가 누적되어 현재 유저들에게 블라인드 처리된 게시글입니다.</span>
                <form action={grantPostImmunity}>
                  <button type="submit" className="px-4 py-2 bg-red-600 text-white text-[11px] font-bold rounded-sm hover:bg-red-700 transition-colors shadow-sm">
                    🛡️ 복구 및 면역
                  </button>
                </form>
              </div>
            )}
            <div className="min-h-[300px] text-[17px] whitespace-pre-wrap leading-relaxed ql-editor" dangerouslySetInnerHTML={{ __html: finalContent }} />
          </div>
        )}
        
        <div className="mt-16 flex justify-center gap-3 border-t pt-10">
          <PostLikeButton postId={postId} initialLikes={post.likes || 0} initialHasLiked={hasLiked} toggleAction={toggleLike} isAdmin={isAdmin} />
          <PostScrapButton postId={postId} initialHasScrapped={hasScrapped} toggleScrapAction={toggleScrap} />
          <PostReportButton postId={postId} currentUserId={currentUserId} isAdmin={isAdmin} />
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

        <div className="mt-16 bg-gray-50 p-5 border rounded-sm shadow-sm">
           <h3 className="font-bold text-lg border-b pb-3 border-gray-200">댓글 <span className="text-[#e74c3c]">{comments.length}</span></h3>
           
           <div className="mt-4">{commentTree.map(node => renderCommentNode(node, 0))}</div>
           
           <div className="mt-8">
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