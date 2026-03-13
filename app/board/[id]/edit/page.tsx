// @ts-nocheck
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import EditClient from './EditClient';

export const dynamic = 'force-dynamic';

export default async function EditPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  const cookieStore = await cookies();
  const currentUser = cookieStore.get('ojemi_user')?.value;
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  
  if (!currentUser) redirect('/login');
  const isAdmin = currentUserId === 'admin';

  // 1. 기존 게시글 가져오기
  const { rows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = rows[0];

  if (!post) return <div className="p-20 text-center font-bold text-gray-400">글을 찾을 수 없습니다.</div>;

  // 권한 체크
  const isAuthor = currentUserId === post.author_id || (!post.author_id && currentUser === post.author);
  if (!isAuthor && !isAdmin) {
    redirect(`/board/${postId}`);
  }

  // 2. 통제실 데이터 (방어막 & 게시판 목록) 실시간 가져오기
  let isGlobalLocked = false;
  let boards: any[] = [];
  try {
    const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'global_write_lock'`;
    if (settings.length > 0 && settings[0].value === 'true') isGlobalLocked = true;
    
    const { rows: boardRows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    boards = boardRows;
  } catch (e) {}

  // 3. 💡 [서버 액션] 수정한 글을 DB에 저장하는 마법!
  async function updateAction(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const category = formData.get('category') as string;
    
    try {
      // 제목에 [카테고리] 꼬리표 다시 예쁘게 달아주기
      const cleanTitle = title.replace(/^\[.*?\]\s*/, '');
      const newTitle = `[${category}] ${cleanTitle}`;
      
      await sql`UPDATE posts SET title = ${newTitle}, content = ${content} WHERE id = ${postId}`;
      
      revalidatePath(`/board`);
      revalidatePath(`/board/${postId}`);
      return { success: true };
    } catch (error) {
      return { error: '수정 실패' };
    }
  }

  // 짝꿍인 EditClient에게 모든 정보(무기)를 다 넘겨줍니다!
  return (
    <EditClient 
      currentUser={currentUser} 
      post={post} 
      isAdmin={isAdmin}
      isGlobalLocked={isGlobalLocked}
      boards={boards}
      updateAction={updateAction}
    />
  );
}