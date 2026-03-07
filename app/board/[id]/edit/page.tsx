import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import EditClient from './EditClient';

export default async function EditPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  const { rows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = rows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다</div>;
  }

  // 💡 미나의 해결책: 에러를 브라우저가 오해하지 않도록 구조를 바꿨습니다!
  const updatePost = async (formData: FormData) => {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    let isSuccess = false;

    try {
      await sql`
        UPDATE posts 
        SET title = ${title}, content = ${content} 
        WHERE id = ${postId}
      `;
      isSuccess = true;
    } catch (error) {
      console.error("수정 DB 에러:", error);
      return { error: 'DB_ERROR' };
    }

    // 서버 방어막(try-catch) 바깥에서 안전하게 화면을 이동시킵니다.
    if (isSuccess) {
      revalidatePath(`/board/${postId}`);
      revalidatePath('/board');
      redirect(`/board/${postId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <EditClient post={post} updateAction={updatePost} />
        </div>
      </main>
    </div>
  );
}