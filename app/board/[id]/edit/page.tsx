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
  const currentUser = cookieStore.get('humorin_user')?.value;
  const currentUserId = cookieStore.get('humorin_userid')?.value;
  
  if (!currentUser) redirect('/login');

  let isAdmin = currentUserId === 'admin';
  try {
    if (!isAdmin && currentUserId) {
      const { rows: adminRows } = await sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (adminRows.length > 0 && adminRows[0].is_admin) {
        isAdmin = true;
      }
    }
  } catch(e) {}

  const { rows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = rows[0];

  if (!post) return <div className="p-20 text-center font-bold text-gray-400">글을 찾을 수 없습니다.</div>;

  const isAuthor = currentUserId === post.author_id || (!post.author_id && currentUser === post.author);
  if (!isAuthor && !isAdmin) {
    redirect(`/board/${postId}`);
  }

  let isGlobalLocked = false;
  let boards: any[] = [];
  try {
    const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'global_write_lock'`;
    if (settings.length > 0 && settings[0].value === 'true') isGlobalLocked = true;
    
    const { rows: boardRows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    boards = boardRows;
  } catch (e) {}

  async function updateAction(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const category = formData.get('category') as string;
    
    // 클라이언트에서 보낸 2개의 공지 상태값을 모두 받습니다.
    const isNoticeRaw = formData.get('is_notice') as string;
    const isBoardNoticeRaw = formData.get('is_board_notice') as string;
    
    let finalIsNotice = false;
    let finalIsBoardNotice = false;

    // 관리자일 때만 공지 상태 변경을 허용합니다.
    if (isAdmin) {
      if (isNoticeRaw === 'true') finalIsNotice = true;
      if (isBoardNoticeRaw === 'true') finalIsBoardNotice = true;
    }

    try {
      const cleanTitle = title.replace(/^\[.*?\]\s*/, '');
      const newTitle = `[${category}] ${cleanTitle}`;
      
      // DB 업데이트 쿼리에 is_board_notice = ${finalIsBoardNotice} 도 함께 갱신합니다.
      await sql`
        UPDATE posts 
        SET title = ${newTitle}, content = ${content}, is_notice = ${finalIsNotice}, is_board_notice = ${finalIsBoardNotice} 
        WHERE id = ${postId}
      `;
      
      revalidatePath(`/board`);
      revalidatePath(`/board/${postId}`);
      return { success: true };
    } catch (error) {
      return { error: '수정 실패' };
    }
  }

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