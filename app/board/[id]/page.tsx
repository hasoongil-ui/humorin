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
import DeleteConfirmButton from './DeleteConfirmButton';
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
    if (!post) return { title: '오재미' };
    const { cleanTitle } = extractData(post.title);
    const postContent = post.content || '';
    const plainText = postContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const description = plainText.length > 0 ? (plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText) : cleanTitle; 
    let ogImageUrl = null;
    let twitterImageUrl = null;
    const imgMatch = postContent.match(/<img[^>]*src=["']([^"'>]+)["']/i);
    if (imgMatch && imgMatch[1]) {
      const rawUrl = imgMatch[1];
      ogImageUrl = rawUrl;
      twitterImageUrl = `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&w=1200&h=630&fit=cover&a=top`;
    } else {
      const ytMatch = postContent.match(/<iframe[^>]*src=["'](?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtu\.be\/)([^"'>?]+)/i);
      if (ytMatch && ytMatch[1]) {
        ogImageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        twitterImageUrl = ogImageUrl;
      }
    }
    const videoMatch = postContent.match(/<video[^>]*src=["']([^"'>]+)["']/i);
    const videoUrl = videoMatch ? videoMatch[1] : null;
    const postUrl = `https://www.ojemi.kr/board/${postId}`;
    return {
      title: `${cleanTitle} - 오재미`,
      description: description,
      alternates: { canonical: postUrl },
      openGraph: {
        title: cleanTitle,
        description: description,
        url: postUrl, 
        siteName: '오재미',
        images: ogImageUrl ? [{ url: ogImageUrl }] : [],
        videos: videoUrl ? [{ url: videoUrl }] : [],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: cleanTitle,
        description: description,
        images: twitterImageUrl ? [twitterImageUrl] : [],
      }
    };
  } catch (error) { return { title: '오재미' }; }
}

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
      if (adminRows.length > 0 && adminRows[0].is_admin) isAdmin = true;
    } catch (e) {}
  }

  await sql`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ${postId}`;
  const { rows: postRows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = postRows[0];

  if (!post) return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다</div>;

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
      .map(c => ({ ...c, children: buildTree(allComments, c.id) }));
  };
  const commentTree = buildTree(comments, null);

  let hasLiked = false, hasDisliked = false, hasScrapped = false; 
  let userCommentLikes: number[] = [], userCommentDislikes: number[] = []; 
  
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

    try {
      const { rows: commentRows } = await sql`SELECT content, image_data FROM comments WHERE post_id = ${postId}`;
      let allTextToSearch = post.content || '';
      commentRows.forEach(c => { allTextToSearch += ' ' + (c.content || '') + ' ' + (c.image_data || ''); });
      const uniqueKeys = new Set<string>();
      const matches = allTextToSearch.match(/[0-9]{13}-[a-zA-Z0-9-_]+\.[a-zA-Z0-9]+/gi);
      if (matches) matches.forEach(key => uniqueKeys.add(key));
      const fileKeysToDelete = Array.from(uniqueKeys).map(key => ({ Key: key }));

      if (fileKeysToDelete.length > 0 && process.env.R2_BUCKET_NAME) {
        const s3 = new S3Client({
          region: 'auto',
          endpoint: process.env.R2_ENDPOINT || '',
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
          },
        });
        await s3.send(new DeleteObjectsCommand({ Bucket: process.env.R2_BUCKET_NAME, Delete: { Objects: fileKeysToDelete } }));
      }
    } catch (e) { console.error('게시글 삭제 중 미디어 즉시 삭제 실패:', e); }

    // 🚨 [수술 완료] 댓글 관련 데이터 선제 타격 삭제 로직
    await sql`DELETE FROM likes WHERE post_id = ${postId}`;
    await sql`DELETE FROM post_dislikes WHERE post_id = ${postId}`;
    await sql`DELETE FROM scraps WHERE post_id = ${postId}`;
    await sql`DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ${postId})`;
    await sql`DELETE FROM comment_dislikes WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ${postId})`;
    await sql`DELETE FROM comments WHERE post_id = ${postId}`;

    await sql`DELETE FROM posts WHERE id = ${postId}`;
    if (post.author_id) {
      await sql`UPDATE users SET points = GREATEST(COALESCE(points, 0) - 10, 0) WHERE user_id = ${post.author_id}`;
    }
    redirect('/board');
  };

  // ... (이후 toggleLike, toggleDislike, toggleScrap, addComment, editComment, deleteComment, toggleCommentLike, toggleCommentDislike, grantPostImmunity, grantCommentImmunity, renderCommentNode 함수들은 대장님 원본과 100% 동일하므로 생략하지 않고 그대로 유지됨을 의미합니다. 실제 파일에선 아래 코드를 이어서 붙이시면 됩니다.)

  const toggleLike = async () => { /* ... 생략 ... */ };
  // (지면 관계상 중간 함수들은 대장님 코드 그대로 유지하시면 됩니다. 핵심은 deletePost의 싹쓸이 로직입니다.)

  // [중요] 아래 return 부분도 대장님 디자인 그대로 유지입니다.
  return (
    // ... 대장님 디자인 코드 ...
  );
}