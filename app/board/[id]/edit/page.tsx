// 파일 위치: app/board/[id]/edit/page.tsx
// @ts-nocheck
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import EditClient from './EditClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EditPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  const cookieStore = await cookies();
  const currentUser = cookieStore.get('humorin_user')?.value;
  const currentUserId = cookieStore.get('humorin_userid')?.value;
  
  if (!currentUser) redirect('/login');

  let isAdmin = currentUserId === 'admin';
  let userStatus = 'active';

  try {
    if (currentUserId) {
      const { rows: userRows } = await sql`SELECT is_admin, status FROM users WHERE user_id = ${currentUserId}`;
      if (userRows.length > 0) {
        if (userRows[0].is_admin) isAdmin = true;
        userStatus = userRows[0].status || 'active';
      }
    }
  } catch(e) {}

  if (userStatus === 'banned' && !isAdmin) {
    return (
      <div className="min-h-[70vh] bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-12 rounded-lg shadow-md border border-red-200 text-center max-w-lg w-full">
          <div className="text-red-500 text-6xl mb-6">🚨</div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-4">이용이 정지된 계정입니다</h2>
          <p className="text-[15px] text-gray-600 font-medium leading-relaxed mb-8">
            관리자에 의해 게시글 수정 권한이 영구 제한되었습니다.
          </p>
          <Link href={`/board/${postId}`} className="inline-block px-8 py-3.5 bg-[#414a66] text-white font-bold rounded-sm hover:bg-[#2a3042] transition-colors shadow-sm">
            게시글로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

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
    
    const isNoticeRaw = formData.get('is_notice') as string;
    const isBoardNoticeRaw = formData.get('is_board_notice') as string;
    
    let finalIsNotice = false;
    let finalIsBoardNotice = false;

    if (isAdmin) {
      if (isNoticeRaw === 'true') finalIsNotice = true;
      if (isBoardNoticeRaw === 'true') finalIsBoardNotice = true;
    }

    let actionStatus = 'active';
    if (!isAdmin && currentUserId) {
      try {
        const { rows } = await sql`SELECT status FROM users WHERE user_id = ${currentUserId}`;
        if (rows.length > 0) actionStatus = rows[0].status || 'active';
      } catch (e) {}
    }

    if (actionStatus === 'banned') return { error: '이용이 정지된 계정입니다.' };
    const isShadowBanned = (actionStatus === 'shadow_banned');

    try {
      const cleanTitle = title.replace(/^\[.*?\]\s*/, '');
      const newTitle = `[${category}] ${cleanTitle}`;
      
      // 💡 [수술 완료] DB 쿼리문에 category = ${category} 를 추가하여 실제 카테고리값도 함께 이동하게 만들었습니다!
      if (isShadowBanned) {
        await sql`
          UPDATE posts 
          SET title = ${newTitle}, content = ${content}, category = ${category}, is_notice = ${finalIsNotice}, is_board_notice = ${finalIsBoardNotice}, is_blinded = true
          WHERE id = ${postId}
        `;
      } else {
        await sql`
          UPDATE posts 
          SET title = ${newTitle}, content = ${content}, category = ${category}, is_notice = ${finalIsNotice}, is_board_notice = ${finalIsBoardNotice} 
          WHERE id = ${postId}
        `;
      }
      
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