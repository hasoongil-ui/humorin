import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { PostLikeButton, CommentLikeButton, PostScrapButton } from './InteractiveButtons';
import CommentForm from './CommentForm';

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

  // 👑 미나의 완벽한 절대 권력 탐지기: 로그인한 진짜 아이디가 'admin'이면 무조건 관리자!
  const isAdmin = currentUserId === 'admin';

  // 조회수 증가
  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;

  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다</div>;
  }

  const isAuthor = currentUser === post.author || currentUserId === post.author;
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
  let hasScrapped = false; 
  let userCommentLikes: number[] = [];
  
  if (currentUser) {
    const { rows: likeRows } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
    if (likeRows.length > 0) hasLiked = true;

    try {
      const { rows: scrapRows } = await sql`SELECT * FROM scraps WHERE post_id = ${postId} AND author = ${currentUser}`;
      if (scrapRows.length > 0) hasScrapped = true;
    } catch (e) {}

    const { rows: clRows } = await sql`SELECT comment_id FROM comment_likes WHERE author = ${currentUser}`;
    userCommentLikes = clRows.map(row => row.comment_id);
  }

  const dbDate = new Date(post.date);
  const kstDate = new Date(dbDate.getTime() + 9 * 60 * 60 * 1000);
  const formattedDate = `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')} ${String(kstDate.getHours()).padStart(2, '0')}:${String(kstDate.getMinutes()).padStart(2, '0')}`;
  const postData = extractData(post.title);

  const deletePost = async () => {
    'use server';
    if (!isAdmin && !isAuthor) return; 
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    redirect('/board');
  };

  const toggleLike = async () => {
    'use server';
    if (!currentUser) redirect('/login');
    const { rows: checkRows = [] } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
    
    const likePower = isAdmin ? 10 : 1; 

    if (checkRows.length > 0) {
      await sql`DELETE FROM likes WHERE post_id = ${postId} AND author = ${currentUser}`;
      await sql`UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - ${likePower}, 0) WHERE id = ${postId}`;
    } else {
      await sql`INSERT INTO likes (post_id, author) VALUES (${postId}, ${currentUser})`;
      await sql`UPDATE posts SET likes = COALESCE(likes, 0) + ${likePower} WHERE id = ${postId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const toggleScrap = async () => {
    'use server';
    if (!currentUser) redirect('/login');
    const { rows: checkRows = [] } = await sql`SELECT * FROM scraps WHERE post_id = ${postId} AND author = ${currentUser}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM scraps WHERE post_id = ${postId} AND author = ${currentUser}`;
    } else {
      await sql`INSERT INTO scraps (post_id, author) VALUES (${postId}, ${currentUser})`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const addComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) return;
    const content = (formData.get('content') as string) || ''; 
    const parentId = formData.get('parentId') as string;
    const imageUrl = formData.get('imageUrl') as string;
    const finalImage = imageUrl || null;
    if (!content.trim() && !finalImage) return; 

    if (parentId) {
      await sql`INSERT INTO comments (post_id, author, content, parent_id, image_data) VALUES (${postId}, ${currentUser}, ${content}, ${parentId}, ${finalImage})`;
    } else {
      await sql`INSERT INTO comments (post_id, author, content, image_data) VALUES (${postId}, ${currentUser}, ${content}, ${finalImage})`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const deleteComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) return;
    const commentId = formData.get('commentId') as string;
    const { rows = [] } = await sql`SELECT author FROM comments WHERE id = ${commentId}`;
    if (rows.length > 0 && (isAdmin || rows[0].author === currentUser)) {
      await sql`DELETE FROM comments WHERE id = ${commentId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const editComment = async (formData: FormData) => {
    'use server';
    if (!currentUser) return;
    const commentId = formData.get('commentId') as string;
    const content = (formData.get('content') as string) || '';
    const imageUrl = formData.get('imageUrl') as string;

    const { rows = [] } = await sql`SELECT author FROM comments WHERE id = ${commentId}`;
    if (rows.length > 0 && rows[0].author === currentUser) {
      const finalImage = imageUrl || null;
      if (!content.trim() && !finalImage) return;
      await sql`UPDATE comments SET content = ${content}, image_data = ${finalImage} WHERE id = ${commentId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const toggleCommentLike = async (formData: FormData) => {
    'use server';
    if (!currentUser) return;
    const commentId = formData.get('commentId') as string;
    const { rows: checkRows = [] } = await sql`SELECT * FROM comment_likes WHERE comment_id = ${commentId} AND author = ${currentUser}`;
    
    const likePower = isAdmin ? 10 : 1;

    if (checkRows.length > 0) {
      await sql`DELETE FROM comment_likes WHERE comment_id = ${commentId} AND author = ${currentUser}`;
      await sql`UPDATE comments SET likes = GREATEST(COALESCE(likes, 0) - ${likePower}, 0) WHERE id = ${commentId}`;
    } else {
      await sql`INSERT INTO comment_likes (comment_id, author) VALUES (${commentId}, ${currentUser})`;
      await sql`UPDATE comments SET likes = COALESCE(likes, 0) + ${likePower} WHERE id = ${commentId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const renderCommentNode = (node: any, depth: number = 0) => {
    const isReply = depth > 0;
    const paddingLeft = isReply ? `${Math.min(depth * 1.5, 4)}rem` : '0';
    const isCommentAuthor = currentUser === node.author;
    const canDeleteComment = isCommentAuthor || isAdmin; 
    const hasUserLikedComment = userCommentLikes.includes(node.id);
    
    return (
      <div key={node.id} className="w-full">
        <div className={`p-4 border-b border-gray-100 relative group transition-colors ${isReply ? 'bg-gray-50/70' : 'bg-white'}`} style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '1rem' }}>
          {isReply && <div className="absolute left-2 top-5 border-l-2 border-b-2 border-gray-300 w-3 h-3 rounded-bl-sm" style={{ left: `calc(${paddingLeft} - 0.5rem)` }}></div>}
          <div className="flex justify-between items-start mb-2">
            <div className="font-bold text-gray-800 text-[13.5px] flex items-center gap-2">
              {node.author}
              {node.likes >= 3 && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] rounded-sm">베스트</span>}
            </div>
            {canDeleteComment && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {isCommentAuthor && <label htmlFor={`edit-${node.id}`} className="cursor-pointer px-2.5 py-1 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm font-medium">수정</label>}
                <form action={deleteComment}>
                  <input type="hidden" name="commentId" value={node.id} />
                  <button type="submit" className={`px-2.5 py-1 bg-white border border-gray-200 rounded-sm transition-colors shadow-sm font-medium ${isAdmin && !isCommentAuthor ? 'text-red-500 border-red-200 hover:bg-red-50' : 'hover:bg-gray-50 hover:text-red-500'}`}>
                    {isAdmin && !isCommentAuthor ? '🚨 강제삭제' : '삭제'}
                  </button>
                </form>
              </div>
            )}
          </div>
          <div className="text-gray-800 text-[15px] mb-3 leading-relaxed break-words whitespace-pre-wrap">{node.content}</div>
          {node.image_data && <div className="mb-4"><img src={node.image_data} alt="첨부이미지" className="max-w-full md:max-w-md rounded-sm border border-gray-200 shadow-sm" /></div>}
          <div className="flex items-center gap-3">
            <label htmlFor={`reply-${node.id}`} className="cursor-pointer text-[13px] text-gray-500 font-bold hover:text-[#3b4890] flex items-center gap-1 transition-colors">답글</label>
            {/* 💡 미나의 핵심: 댓글 공감 버튼에도 isAdmin 꽂아넣기! */}
            <CommentLikeButton commentId={node.id} initialLikes={node.likes || 0} initialHasLiked={hasUserLikedComment} toggleAction={toggleCommentLike} isAdmin={isAdmin} />
          </div>
        </div>
        <div className="w-full"><input type="checkbox" id={`reply-${node.id}`} className="hidden peer" /><div className="hidden peer-checked:block bg-gray-100 p-3 sm:p-4 border-b border-gray-200">{currentUser ? <div style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '0' }}><CommentForm postId={postId} parentId={node.id} author={node.author} actionType="reply" submitAction={addComment} /></div> : <div className="text-center text-gray-500 font-bold text-sm py-2">로그인 후 답글 가능</div>}</div></div>
        {node.children && node.children.length > 0 && <div className="w-full">{node.children.map((child: any) => renderCommentNode(child, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <div className="bg-white font-sans rounded-sm shadow-sm border border-gray-200">
      {isAdmin && (
        <div className="bg-red-600 text-white text-center py-2 text-sm font-black tracking-wide shadow-md sticky top-0 z-[9999]">
          👑 최고 관리자(admin) 모드로 접속 중입니다.
        </div>
      )}
      <main className="max-w-[1000px] mx-auto p-5 md:p-8 mt-4 mb-20 overflow-hidden">
        <div className="border-b-2 border-gray-800 pb-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 break-words"><span className="text-[#3b4890] mr-2">[{postData.cat}]</span>{postData.cleanTitle}</h1>
          <div className="flex justify-between text-gray-500 text-sm">
            <div className="font-bold text-gray-700 text-base flex items-center gap-2">
              {post.author} 
              {isAdmin && (post.author === currentUser || post.author === 'admin') && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[11px] rounded-sm font-black">Admin</span>}
            </div>
            <div className="flex gap-4 font-medium"><span className="text-rose-500 font-bold">공감 {post.likes || 0}</span></div>
          </div>
        </div>
        <div className="min-h-[300px] text-gray-900 text-base md:text-[17px] whitespace-pre-wrap leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: post.content }} />
        <div className="mt-16 flex justify-center items-center gap-3 border-t border-gray-100 pt-10">
          {/* 💡 미나의 핵심: 게시글 공감 버튼에도 isAdmin 꽂아넣기! */}
          <PostLikeButton postId={postId} initialLikes={post.likes || 0} initialHasLiked={hasLiked} toggleAction={toggleLike} isAdmin={isAdmin} />
          <PostScrapButton postId={postId} initialHasScrapped={hasScrapped} toggleScrapAction={toggleScrap} />
        </div>
        <div className="mt-12 border-t border-gray-200 pt-6 flex justify-between items-center">
          <div className="flex gap-2">
            {(isAuthor || isAdmin) && (
              <form action={deletePost}>
                <button type="submit" className={`px-6 py-2 text-white rounded-sm font-bold text-sm ${isAdmin && !isAuthor ? 'bg-red-600' : 'bg-[#e06c75]'}`}>
                  {isAdmin && !isAuthor ? '🚨 관리자 강제삭제' : '삭제'}
                </button>
              </form>
            )}
          </div>
          <Link href={`/board`} className="px-8 py-2 bg-[#414a66] text-white rounded-sm font-bold text-sm">목록으로</Link>
        </div>
        <div className="mt-16 bg-gray-50 px-5 py-4 border border-gray-200">
           <h3 className="text-[16px] font-bold text-gray-800">댓글 <span className="text-[#e74c3c]">{comments.length}</span></h3>
           <div className="mt-4">{commentTree.map(node => renderCommentNode(node, 0))}</div>
           <div className="mt-6">{currentUser ? <CommentForm postId={postId} actionType="main" submitAction={addComment} /> : <div className="p-4 bg-white border text-center font-bold text-sm">로그인이 필요합니다.</div>}</div>
        </div>
      </main>
    </div>
  );
}