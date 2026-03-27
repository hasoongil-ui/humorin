// @ts-nocheck
import { sql } from '@vercel/postgres';
import sanitizeHtml from 'sanitize-html'; 
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { PostLikeButton, PostDislikeButton, CommentLikeButton, CommentDislikeButton, PostScrapButton, PostReportButton, CommentReportButton, EditCommentForm, PostShareButton, CopyLinkBox } from './InteractiveButtons'; 
import CommentForm from './CommentForm';
import VideoVolumeFix from './VideoVolumeFix'; 
import { Metadata } from 'next';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3'; 

function getSeoDatetime(dateString: any) {
  if (!dateString) return '';
  try { return new Date(dateString).toISOString(); } catch(e) { return ''; }
}

function getDisplayDate(dateString: any) {
  if (!dateString) return '';
  try {
    const dbDate = new Date(dateString);
    const kstDate = new Date(dbDate.getTime() + 9 * 60 * 60 * 1000);
    const yy = kstDate.getFullYear().toString().slice(2);
    const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(kstDate.getDate()).padStart(2, '0');
    const hh = String(kstDate.getHours()).padStart(2, '0');
    const min = String(kstDate.getMinutes()).padStart(2, '0');
    return `${yy}.${mm}.${dd} ${hh}:${min}`;
  } catch(e) { return ''; }
}

function extractData(fullTitle: string) {
  if (!fullTitle) return { cat: '일반', cleanTitle: '' };
  const match = fullTitle.match(/^\[(.*?)\]\s*(.*)$/);
  return match ? { cat: match[1], cleanTitle: match[2] } : { cat: '일반', cleanTitle: fullTitle };
}

const extractTextOnly = (htmlText: string) => {
  const noHtml = htmlText.replace(/<[^>]*>?/gm, ''); 
  return noHtml.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, '').toLowerCase(); 
};

export async function generateMetadata(props: any): Promise<Metadata> {
  const params = await props.params;
  const postId = params.id;

  try {
    const { rows } = await sql`SELECT title, content FROM posts WHERE id = ${postId}`;
    const post = rows[0];

    if (!post) {
      return { title: '오재미' };
    }

    const { cleanTitle } = extractData(post.title);
    const postContent = post.content || '';

    const plainText = postContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const description = plainText.length > 0 
      ? (plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText) 
      : cleanTitle; 

    let imageUrl = null;

    const imgMatch = postContent.match(/<img[^>]*src=["']([^"'>]+)["']/i);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
    } 
    else {
      const ytMatch = postContent.match(/<iframe[^>]*src=["'](?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtu\.be\/)([^"'>?]+)/i);
      if (ytMatch && ytMatch[1]) {
        imageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }

    const videoMatch = postContent.match(/<video[^>]*src=["']([^"'>]+)["']/i);
    const videoUrl = videoMatch ? videoMatch[1] : null;

    return {
      title: `${cleanTitle} - 오재미`,
      description: description,
      openGraph: {
        title: cleanTitle,
        description: description,
        siteName: '오재미',
        images: imageUrl ? [{ url: imageUrl }] : [],
        videos: videoUrl ? [{ url: videoUrl }] : [],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: cleanTitle,
        description: description,
        images: imageUrl ? [imageUrl] : [],
      }
    };
  } catch (error) {
    return { title: '오재미' };
  }
}

// --------------------------------------------------------------------------------

export default async function PostDetailPage(props: any) {
  const params = await props.params;
  const searchParams = await props.searchParams; 
  const postId = params.id;
  const fromLocation = searchParams?.from; 

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
  let hasDisliked = false; 
  let hasScrapped = false; 
  let userCommentLikes: number[] = [];
  let userCommentDislikes: number[] = []; 
  
  if (currentUserId) {
    const { rows: likeRows } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
    if (likeRows.length > 0) hasLiked = true;

    try {
      const { rows: dislikeRows } = await sql`SELECT * FROM post_dislikes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
      if (dislikeRows.length > 0) hasDisliked = true;
    } catch (e) {}

    try {
      const { rows: scrapRows } = await sql`SELECT * FROM scraps WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
      if (scrapRows.length > 0) hasScrapped = true;
    } catch (e) {}

    const { rows: clRows } = await sql`SELECT comment_id FROM comment_likes WHERE author_id = ${currentUserId}`;
    userCommentLikes = clRows.map(row => row.comment_id);

    try {
      const { rows: cdlRows } = await sql`SELECT comment_id FROM comment_dislikes WHERE author_id = ${currentUserId}`;
      userCommentDislikes = cdlRows.map(row => row.comment_id);
    } catch (e) {}
  }

  const deletePost = async () => {
    'use server';
    if (!isAdmin && !isAuthor) return; 

    // 💡 [1단계: 초고속 미디어 폭파] 무식한 전체 DB 검색 싹 폐기! 내 글에 있는 사진만 즉시 0.1초 컷 폭파!
    try {
      const { rows: commentRows } = await sql`SELECT content, image_data FROM comments WHERE post_id = ${postId}`;
      let allTextToSearch = post.content || '';
      commentRows.forEach(c => {
         allTextToSearch += ' ' + (c.content || '') + ' ' + (c.image_data || '');
      });

      const uniqueKeys = new Set<string>();
      const matches = allTextToSearch.match(/[0-9]{13}-[a-zA-Z0-9-_]+\.[a-zA-Z0-9]+/gi);
      if (matches) {
        matches.forEach(key => uniqueKeys.add(key));
      }

      const fileKeysToDelete = Array.from(uniqueKeys).map(key => ({ Key: key }));

      // 군말 없이 즉시 파괴! (다른 테이블 검사 로직 전면 삭제)
      if (fileKeysToDelete.length > 0 && process.env.R2_BUCKET_NAME) {
        const s3 = new S3Client({
          region: 'auto',
          endpoint: process.env.R2_ENDPOINT || '',
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
          },
        });
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Delete: { Objects: fileKeysToDelete }
        });
        await s3.send(deleteCommand);
      }
    } catch (e) {
      console.error('게시글 삭제 중 미디어 즉시 삭제 실패:', e);
    }

    // 💡 [2단계: DB 찌꺼기 완벽 청소] 부모 글을 지우기 전에 얽혀있는 자식 데이터들을 먼저 깔끔하게 지웁니다!
    await sql`DELETE FROM likes WHERE post_id = ${postId}`;
    await sql`DELETE FROM post_dislikes WHERE post_id = ${postId}`;
    await sql`DELETE FROM scraps WHERE post_id = ${postId}`;
    
    // 댓글에 달린 공감/비공감 먼저 삭제 -> 그다음 댓글 삭제
    await sql`DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ${postId})`;
    await sql`DELETE FROM comment_dislikes WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ${postId})`;
    await sql`DELETE FROM comments WHERE post_id = ${postId}`;

    // 💡 [3단계: 부모 게시글 삭제 및 포인트 회수]
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    if (post.author_id) {
      await sql`UPDATE users SET points = GREATEST(COALESCE(points, 0) - 10, 0) WHERE user_id = ${post.author_id}`;
    }
    
    redirect('/board');
  };

  const toggleLike = async () => {
    'use server';
    if (!currentUserId) redirect('/login');
    
    if (isAdmin) {
      await sql`
        UPDATE posts 
        SET likes = COALESCE(likes, 0) + 10,
            best_at = CASE WHEN COALESCE(likes, 0) + 10 >= 10 AND best_at IS NULL THEN NOW() ELSE best_at END,
            best100_at = CASE WHEN COALESCE(likes, 0) + 10 >= 100 AND best100_at IS NULL THEN NOW() ELSE best100_at END,
            best1000_at = CASE WHEN COALESCE(likes, 0) + 10 >= 1000 AND best1000_at IS NULL THEN NOW() ELSE best1000_at END
        WHERE id = ${postId}
      `;
      revalidatePath(`/board/${postId}`);
      return;
    }

    const { rows: checkRows = [] } = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM likes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
      await sql`UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${postId}`;
    } else {
      await sql`INSERT INTO likes (post_id, author, author_id) VALUES (${postId}, ${currentUser}, ${currentUserId})`;
      await sql`
        UPDATE posts 
        SET likes = COALESCE(likes, 0) + 1,
            best_at = CASE WHEN COALESCE(likes, 0) + 1 >= 10 AND best_at IS NULL THEN NOW() ELSE best_at END,
            best100_at = CASE WHEN COALESCE(likes, 0) + 1 >= 100 AND best100_at IS NULL THEN NOW() ELSE best100_at END,
            best1000_at = CASE WHEN COALESCE(likes, 0) + 1 >= 1000 AND best1000_at IS NULL THEN NOW() ELSE best1000_at END
        WHERE id = ${postId}
      `;
    }
    revalidatePath(`/board/${postId}`);
  };

  const toggleDislike = async () => {
    'use server';
    if (!currentUserId) redirect('/login');
    
    let blindThreshold = 5;
    try {
      const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'report_blind_threshold'`;
      if (rows.length > 0) blindThreshold = Number(rows[0].value) || 5;
    } catch(e) {}

    if (isAdmin) {
      await sql`
        UPDATE posts 
        SET dislikes = COALESCE(dislikes, 0) + 10,
            is_blinded = CASE WHEN COALESCE(dislikes, 0) + 10 >= ${blindThreshold} THEN true ELSE is_blinded END
        WHERE id = ${postId}
      `;
      revalidatePath(`/board/${postId}`);
      return;
    }

    const { rows: checkRows = [] } = await sql`SELECT * FROM post_dislikes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM post_dislikes WHERE post_id = ${postId} AND author_id = ${currentUserId}`;
      await sql`UPDATE posts SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = ${postId}`;
    } else {
      await sql`INSERT INTO post_dislikes (post_id, author_id) VALUES (${postId}, ${currentUserId})`;
      await sql`
        UPDATE posts 
        SET dislikes = COALESCE(dislikes, 0) + 1,
            is_blinded = CASE WHEN COALESCE(dislikes, 0) + 1 >= ${blindThreshold} THEN true ELSE is_blinded END
        WHERE id = ${postId}
      `;
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
    const imageUrl = (formData.get('imageUrl') || formData.get('image_data') || formData.get('image')) as string;
    const botTrap = formData.get('bot_trap') as string; 
    
    if (botTrap) {
      console.log('🚨 [스팸 봇 차단 완료] 댓글 허니팟 함정에 걸려들었습니다.');
      return { success: true };
    }

    let forbiddenWords: string[] = [];
    try {
      const { rows: fwRows } = await sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
      if (fwRows.length > 0 && fwRows[0].value) {
        forbiddenWords = fwRows[0].value.split(',').map((w: string) => w.trim()).filter((w: string) => w !== '');
      }
    } catch (e) {}

    const cleanContent = extractTextOnly(content);
    for (const word of forbiddenWords) {
      if (cleanContent.includes(word)) {
        console.log(`🚨 [금칙어 차단] 차단된 단어: ${word}`);
        return { error: 'forbidden_word', word: word }; 
      }
    }

    if (!content.trim() && !imageUrl) return; 

    if (parentId) {
      await sql`INSERT INTO comments (post_id, author, author_id, content, parent_id, image_data) VALUES (${postId}, ${currentUser}, ${currentUserId}, ${content}, ${parentId}, ${imageUrl || null})`;
    } else {
      await sql`INSERT INTO comments (post_id, author, author_id, content, image_data) VALUES (${postId}, ${currentUser}, ${currentUserId}, ${content}, ${imageUrl || null})`;
    }
    await sql`UPDATE users SET points = COALESCE(points, 0) + 5 WHERE user_id = ${currentUserId}`;
    revalidatePath(`/board/${postId}`);
  };

  const editComment = async (formData: FormData) => {
    'use server';
    if (!currentUserId) return;
    const commentId = formData.get('commentId') as string;
    const content = formData.get('content') as string;
    const imageUrl = formData.get('imageUrl') as string;

    let forbiddenWords: string[] = [];
    try {
      const { rows: fwRows } = await sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
      if (fwRows.length > 0 && fwRows[0].value) {
        forbiddenWords = fwRows[0].value.split(',').map((w: string) => w.trim()).filter((w: string) => w !== '');
      }
    } catch (e) {}

    const cleanContent = extractTextOnly(content || '');
    for (const word of forbiddenWords) {
      if (cleanContent.includes(word)) {
        console.log(`🚨 [금칙어 차단] 수정 우회 시도 차단됨: ${word}`);
        return { error: 'forbidden_word', word: word }; 
      }
    }

    if (!content.trim() && !imageUrl) return;

    const { rows = [] } = await sql`SELECT author_id FROM comments WHERE id = ${commentId}`;
    if (rows.length > 0) {
      if (rows[0].author_id === currentUserId || isAdmin) {
        await sql`UPDATE comments SET content = ${content}, image_data = ${imageUrl || null} WHERE id = ${commentId}`;
      }
    }
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
        
        const { rows: childRows } = await sql`SELECT id FROM comments WHERE parent_id = ${commentId}`;
        
        if (childRows.length > 0) {
          await sql`UPDATE comments SET content = '작성자가 삭제한 댓글입니다.', author = '알 수 없음', author_id = null, image_data = null WHERE id = ${commentId}`;
        } else {
          await sql`DELETE FROM comments WHERE id = ${commentId}`;
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
    if (checkRows.length > 0) {
      await sql`DELETE FROM comment_likes WHERE comment_id = ${commentId} AND author_id = ${currentUserId}`;
      await sql`UPDATE comments SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = ${commentId}`;
    } else {
      await sql`INSERT INTO comment_likes (comment_id, author, author_id) VALUES (${commentId}, ${currentUser}, ${currentUserId})`;
      await sql`UPDATE comments SET likes = COALESCE(likes, 0) + 1 WHERE id = ${commentId}`;
    }
    revalidatePath(`/board/${postId}`);
  };

  const toggleCommentDislike = async (formData: FormData) => {
    'use server';
    if (!currentUserId) return;
    const commentId = formData.get('commentId') as string;

    let blindThreshold = 5;
    try {
      const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'report_blind_threshold'`;
      if (rows.length > 0) blindThreshold = Number(rows[0].value) || 5;
    } catch(e) {}

    if (isAdmin) {
      await sql`
        UPDATE comments 
        SET dislikes = COALESCE(dislikes, 0) + 10,
            is_blinded = CASE WHEN COALESCE(dislikes, 0) + 10 >= ${blindThreshold} THEN true ELSE is_blinded END
        WHERE id = ${commentId}
      `;
      revalidatePath(`/board/${postId}`);
      return;
    }

    const { rows: checkRows = [] } = await sql`SELECT * FROM comment_dislikes WHERE comment_id = ${commentId} AND author_id = ${currentUserId}`;
    if (checkRows.length > 0) {
      await sql`DELETE FROM comment_dislikes WHERE comment_id = ${commentId} AND author_id = ${currentUserId}`;
      await sql`UPDATE comments SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = ${commentId}`;
    } else {
      await sql`INSERT INTO comment_dislikes (comment_id, author_id) VALUES (${commentId}, ${currentUserId})`;
      await sql`
        UPDATE comments 
        SET dislikes = COALESCE(dislikes, 0) + 1,
            is_blinded = CASE WHEN COALESCE(dislikes, 0) + 1 >= ${blindThreshold} THEN true ELSE is_blinded END
        WHERE id = ${commentId}
      `;
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

  const renderCommentNode = (node: any, depth: number = 0, parentAuthor: string | null = null) => {
    const isReply = depth > 0;
    const paddingLeft = isReply ? `${Math.min(depth * 1.5, 4)}rem` : '0';
    const isCommentAuthor = currentUserId === node.author_id || (!node.author_id && currentUser === node.author);
    const canDeleteComment = isCommentAuthor || isAdmin; 
    const hasUserLikedComment = userCommentLikes.includes(node.id);
    const hasUserDislikedComment = userCommentDislikes.includes(node.id); 
    
    const isDeleted = node.content === '작성자가 삭제한 댓글입니다.';
    
    let bgColorClass = isReply ? 'bg-gray-50/70' : 'bg-white';
    let badge = null;
    
    if (!isDeleted) {
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
    }

    return (
      <div key={node.id} className="w-full">
        <div className={`p-4 border-b border-gray-100 relative group transition-colors duration-300 ${bgColorClass}`} style={{ paddingLeft: isReply ? `calc(1rem + ${paddingLeft})` : '1rem' }}>
          
          <input type="checkbox" id={`edit-${node.id}`} className="hidden peer/edit" />

          <div className="flex justify-between items-start mb-2 mt-1">
            <div className="font-bold text-[13.5px] flex items-center gap-2 flex-wrap">
              {node.author_id ? (
                <Link href={`/user/${node.author_id}`} className="hover:text-[#3b4890] hover:underline cursor-pointer transition-colors">
                  {node.author}
                </Link>
              ) : (
                <span className={isDeleted ? 'text-gray-400 italic' : ''}>{node.author}</span>
              )}
              {badge}
              {!isDeleted && (
                <time dateTime={getSeoDatetime(node.created_at)} className="text-[11px] font-medium text-gray-400 tracking-tight ml-1">
                  {getDisplayDate(node.created_at)}
                </time>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {isCommentAuthor && !isDeleted && (
                <label htmlFor={`edit-${node.id}`} className="cursor-pointer text-[12px] text-gray-400 hover:text-indigo-600 hover:underline">수정</label>
              )}
              {canDeleteComment && !isDeleted && (
                <form action={deleteComment}>
                  <input type="hidden" name="commentId" value={node.id} />
                  <button type="submit" className="text-[12px] text-red-400 hover:text-red-600 hover:underline">삭제</button>
                </form>
              )}
            </div>
          </div>

          {node.is_blinded && !isAdmin ? (
            <div className="text-[14px] mb-3 text-gray-500 italic bg-gray-100 p-3 rounded-md border border-gray-300 shadow-inner flex items-center gap-2">
              보고 싶어 하지 않은 분들이 많아 블라인드 처리된 댓글입니다.
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
              
              <div className="peer-checked/edit:hidden">
                <div className="text-[15px] mb-3 whitespace-pre-wrap text-gray-800 flex items-start gap-1.5">
                  {isReply && parentAuthor && !isDeleted && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5 border border-gray-200">
                      ↳ @{parentAuthor}
                    </span>
                  )}
                  <span className={`${isDeleted ? 'text-gray-400 italic text-[14px]' : ''} leading-relaxed`}>
                    {node.content}
                  </span>
                </div>
                {node.image_data && <div className="mb-4 mt-2"><img src={node.image_data} alt="첨부" className="max-w-full sm:max-w-md h-auto rounded-sm border shadow-sm" /></div>}
              </div>

              {isCommentAuthor && !isDeleted && (
                <div className="hidden peer-checked/edit:block mb-4 mt-2">
                  <EditCommentForm 
                    commentId={node.id} 
                    initialContent={node.content} 
                    initialImage={node.image_data} 
                    editAction={editComment} 
                  />
                </div>
              )}
            </>
          )}

          <div className="peer-checked/edit:hidden">
            {!isDeleted && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 [&_button]:whitespace-nowrap [&_button]:shrink-0 [&_span]:whitespace-nowrap">
                {!isCommentLocked && (
                  <label htmlFor={`reply-${node.id}`} className="cursor-pointer px-2 py-1 border border-gray-300 rounded-sm text-[11px] text-gray-600 font-bold hover:bg-gray-50 flex items-center gap-1 whitespace-nowrap shrink-0">
                    💬 답글
                  </label>
                )}
                <CommentLikeButton commentId={node.id} initialLikes={node.likes || 0} initialHasLiked={hasUserLikedComment} toggleAction={toggleCommentLike} isAdmin={isAdmin} />
                <CommentDislikeButton commentId={node.id} initialDislikes={node.dislikes || 0} initialHasDisliked={hasUserDislikedComment} toggleAction={toggleCommentDislike} isAdmin={isAdmin} />
                <CommentReportButton commentId={node.id} currentUserId={currentUserId} isAdmin={isAdmin} />
              </div>
            )}
          </div>
        </div>
        
        <input type="checkbox" id={`reply-${node.id}`} className="hidden peer/reply" />
        <div className="hidden peer-checked/reply:block bg-gray-100 p-3 border-b border-gray-200">
          {!isCommentLocked && currentUser && !isDeleted && <CommentForm postId={postId} parentId={node.id} author={node.author} actionType="reply" submitAction={addComment} />}
        </div>
        
        {node.children && node.children.map((child: any) => renderCommentNode(child, depth + 1, node.author))}
      </div>
    );
  };

  let finalContent = post.content || '';
  if (finalContent) {
    finalContent = finalContent.replace(
      /<video([^>]*)src="([^"]+)"([^>]*)>/gi,
      (match, beforeSrc, srcUrl, afterSrc) => {
        const newSrc = srcUrl.includes('#t=') ? srcUrl : `${srcUrl}#t=0.001`;
        return `<video controls="true" preload="metadata" playsinline="true" muted="true" class="ojemi-mp4" src="${newSrc}">`;
      }
    );
  }

  const cleanContent = sanitizeHtml(finalContent, {
    allowedTags: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'img', 'video', 'iframe', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'pre', 'span'],
    allowedAttributes: {
      '*': ['class', 'style'], 
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'video': ['src', 'controls', 'preload', 'playsinline', 'muted', 'width', 'height'],
      'iframe': ['src', 'frameborder', 'allowfullscreen', 'width', 'height']
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'youtu.be'] 
  });

  let backToListUrl = '/board';
  if (fromLocation === 'today') backToListUrl = '/board?best=today';
  else if (fromLocation === '100') backToListUrl = '/board?best=100';
  else if (fromLocation === '1000') backToListUrl = '/board?best=1000';
  else if (fromLocation === 'all') backToListUrl = '/board';
  else if (postData.cat !== '일반') backToListUrl = `/board?category=${encodeURIComponent(postData.cat)}`;

  return (
    <div className="bg-white font-sans rounded-sm shadow-sm border border-gray-200 relative">
      <VideoVolumeFix />
      
      <style>{`
        /* 1. 이미지: 웹툰/만화 가독성을 위한 스마트 리사이징 (렌더링 렉 유발 코드 삭제 완료) */
        .ql-editor img {
          display: block;
          max-width: 720px !important; 
          width: 100%; 
          height: auto;
          margin: 0 auto 15px auto;
          border-radius: 8px;
        }

        /* 2. 동영상/유튜브: 기존 황금비율 650px 유지하여 깨짐 방지 */
        .ql-editor iframe.ql-video, .ql-editor iframe.ojemi-youtube,
        .ql-editor video, .ql-editor video.ojemi-mp4 {
          display: block;
          width: 100%;
          max-width: 650px; 
          margin: 10px auto 30px auto;
          border-radius: 8px;
          background-color: #000;
          border: none;
        }
        
        .ql-editor iframe.ql-video, .ql-editor iframe.ojemi-youtube { aspect-ratio: 16 / 9; height: auto; }
        .ql-editor video, .ql-editor video.ojemi-mp4 { height: auto; max-height: 70vh; object-fit: contain; aspect-ratio: auto; }

        /* 3. 스마트폰 모드: 100% 가득 채움 */
        @media (max-width: 768px) {
          .ql-editor img, .ql-editor iframe.ql-video, .ql-editor iframe.ojemi-youtube, .ql-editor video, .ql-editor video.ojemi-mp4 {
            max-width: 100% !important;
          }
        }

        .ql-editor p { min-height: 1.5em; }
        .ql-editor p br { display: block; }
      `}</style>

      <main className="max-w-[1000px] mx-auto p-5 md:p-8 mt-4 mb-20 overflow-hidden">
        
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-2xl md:text-3xl font-black mb-4"><span className="text-[#3b4890] mr-2">[{postData.cat}]</span>{postData.cleanTitle}</h1>
          <div className="flex justify-between items-center text-gray-500 text-sm font-bold flex-wrap gap-y-2">
            
            <div className="flex items-center gap-2">
              {post.author_id ? (
                <Link href={`/user/${post.author_id}`} className="text-[14px] hover:text-[#3b4890] hover:underline cursor-pointer transition-colors">
                  {post.author}
                </Link>
              ) : (<span className="text-[14px]">{post.author}</span>)}
              
              <span className="text-gray-300">|</span>
              
              <time dateTime={getSeoDatetime(post.date)} className="text-[12px] font-medium text-gray-400 tracking-tight">
                {getDisplayDate(post.date)}
              </time>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-gray-400 text-[12px] font-medium flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                {post.views || 0}
              </div>
              <div className="text-rose-500 text-[13px] flex items-center gap-1">
                공감 {post.likes || 0}
              </div>
            </div>

          </div>
        </div>
        
        <CopyLinkBox postId={postId} />
        
        {post.is_blinded && !isAdmin ? (
          <div className="bg-gray-100 p-12 text-center rounded-lg border border-gray-300 my-10 shadow-inner">
            <p className="text-gray-600 font-bold text-lg leading-relaxed">보고 싶어 하지 않은 분들이 많아<br/>블라인드 처리된 게시글입니다.</p>
          </div>
        ) : (
          <div className="post-content-area">
            {post.is_blinded && isAdmin && (
              <div className="bg-red-50 border border-red-200 p-4 sm:p-5 rounded-sm mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                <div>
                  <p className="text-red-600 font-black text-[15px] sm:text-[16px] flex items-center gap-1.5">
                    <span>🚨</span> [관리자 알림] 신고가 누적되어 블라인드 처리된 글입니다.
                  </p>
                  <p className="text-red-500 text-[12px] font-bold mt-1.5 pl-6">
                    복구 버튼을 누르면 신고 횟수가 0으로 초기화되고 다시 정상 노출됩니다.
                  </p>
                </div>
                <form action={grantPostImmunity} className="w-full sm:w-auto text-right">
                  <button type="submit" className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white text-[13px] font-black rounded-sm hover:bg-red-700 shadow-md transition-colors flex items-center justify-center gap-1.5">
                    🛡️ 게시글 복구 (블라인드 해제)
                  </button>
                </form>
              </div>
            )}
            
            <div className="min-h-[300px] text-[17px] whitespace-pre-wrap leading-relaxed ql-editor" dangerouslySetInnerHTML={{ __html: cleanContent }} />
          </div>
        )}
        
        <div className="mt-16 flex justify-center items-center gap-6 sm:gap-10 border-t pt-10 px-2">
          <PostLikeButton postId={postId} initialLikes={post.likes || 0} initialHasLiked={hasLiked} toggleAction={toggleLike} isAdmin={isAdmin} />
          <PostDislikeButton postId={postId} initialDislikes={post.dislikes || 0} initialHasDisliked={hasDisliked} toggleAction={toggleDislike} isAdmin={isAdmin} />
        </div>

        <div className="mt-8 flex justify-end items-center gap-2 px-2">
          <PostShareButton title={postData.cleanTitle} />
          <PostScrapButton postId={postId} initialHasScrapped={hasScrapped} toggleScrapAction={toggleScrap} />
          <PostReportButton postId={postId} currentUserId={currentUserId} isAdmin={isAdmin} />
        </div>
        
        <div className="mt-6 border-t pt-6 flex justify-between">
          <div className="flex gap-2">
            {isAuthor && <Link href={`/board/${postId}/edit`} className="px-6 py-2 border font-bold text-sm rounded-sm">수정</Link>}
            {(isAuthor || isAdmin) && (
              <form action={deletePost}><button type="submit" className="px-6 py-2 bg-[#e06c75] text-white font-bold text-sm rounded-sm">삭제</button></form>
            )}
          </div>
          <Link href={backToListUrl} className="px-8 py-2 bg-[#414a66] text-white font-bold text-sm rounded-sm hover:bg-[#2a3042] transition-colors">목록으로</Link>
        </div>

        <div className="mt-16 bg-gray-50 p-5 border rounded-sm shadow-sm">
           <h3 className="font-bold text-lg border-b pb-3 border-gray-200">댓글 <span className="text-[#e74c3c]">{comments.length}</span></h3>
           <div className="mt-4">{commentTree.map(node => renderCommentNode(node, 0))}</div>
           <div className="mt-8">
             {currentUser ? <CommentForm postId={postId} actionType="main" submitAction={addComment} /> : <div className="p-4 bg-white border border-gray-200 text-center font-bold text-sm text-gray-500 rounded-sm shadow-sm">로그인이 필요합니다.</div>}
           </div>
        </div>
      </main>
    </div>
  );
}