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

  const updatePost = async (formData: FormData) => {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const youtube = formData.get('youtube') as string;

    // 💡 [미나의 철통 보안] 칸을 비웠다면 확실하게 DB에서도 null(없음) 처리합니다!
    const youtubeValue = youtube && youtube.trim() !== '' ? youtube.trim() : null;

    let isSuccess = false;

    try {
      await sql`
        UPDATE posts 
        SET 
          title = ${title}, 
          content = ${content},
          youtube = ${youtubeValue}
        WHERE id = ${postId}
      `;
      isSuccess = true;
    } catch (error) {
      console.error("수정 DB 에러:", error);
      return { error: 'DB_ERROR' };
    }

    if (isSuccess) {
      revalidatePath(`/board/${postId}`);
      revalidatePath('/board');
      redirect(`/board/${postId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4 mb-20">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <EditClient post={post} updateAction={updatePost} />
        </div>
      </main>
    </div>
  );
}