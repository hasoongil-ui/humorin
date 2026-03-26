// @ts-nocheck
import { sql } from '@vercel/postgres';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'; 
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// 💡 [수정 완료] 최신 Next.js 규칙에 맞게 props를 받아와서 await으로 풀어줍니다!
export default async function MonitorControlCenter(props: any) {
  const searchParams = await props.searchParams; 
  const cookieStore = await cookies();
  const userId = cookieStore.get('ojemi_userid')?.value;

  if (userId !== 'admin') {
    let isRealAdmin = false;
    if (userId) {
      try {
        const { rows } = await sql`SELECT is_admin FROM users WHERE user_id = ${userId}`;
        if (rows.length > 0 && rows[0].is_admin) isRealAdmin = true;
      } catch(e) {}
    }
    if (!isRealAdmin) return redirect('/'); 
  }

  let dbSizeBytes = 0;
  let dbError = null;
  try {
    const sizeRes = await sql`SELECT pg_database_size(current_database()) as size_bytes`;
    dbSizeBytes = Number(sizeRes.rows[0].size_bytes) || 0;
  } catch(e: any) { 
    dbError = `🚨 DB 연결 실패: ${e.message}`;
  }

  const dbSizeMB = (dbSizeBytes / 1024 / 1024).toFixed(2);
  const maxDbMB = 256; 
  const dbUsagePercent = Math.min((parseFloat(dbSizeMB) / maxDbMB) * 100, 100).toFixed(1);

  let r2Size = 0;
  let r2Count = 0;
  let r2Error = null;

  if (!process.env.R2_BUCKET_NAME || !process.env.R2_ENDPOINT) {
    r2Error = "🚨 R2_BUCKET_NAME 등의 환경변수가 누락되었습니다.";
  } else {
    try {
      const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME });
      const { Contents } = await s3.send(command);
      if (Contents) {
        r2Count = Contents.length;
        r2Size = Contents.reduce((acc, item) => acc + (item.Size || 0), 0);
      }
    } catch(e: any) { 
      r2Error = `🚨 R2 통신 에러 발생: ${e.message}`;
    }
  }

  const r2SizeMB = (r2Size / 1024 / 1024).toFixed(2);
  const maxR2MB = 10240; 
  const r2UsagePercent = Math.min((parseFloat(r2SizeMB) / maxR2MB) * 100, 100).toFixed(1);

  let totalPosts = 0, totalComments = 0, blindPosts = 0;
  try {
    const { rows: postRows } = await sql`SELECT count(*) as cnt FROM posts`;
    totalPosts = postRows[0].cnt;
    const { rows: commentRows } = await sql`SELECT count(*) as cnt FROM comments`;
    totalComments = commentRows[0].cnt;
    const { rows: blindRows } = await sql`SELECT count(*) as cnt FROM posts WHERE is_blinded = true`;
    blindPosts = blindRows[0].cnt;
  } catch (e) {}

  const cleanUpGhostFiles = async () => {
    'use server';
    let finalCount = 0;
    let finalSizeMB = "0.00";

    try {
      if (process.env.R2_BUCKET_NAME) {
        const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME });
        const { Contents } = await s3.send(command);
        
        if (Contents) {
          const r2KeysToDelete = [];
          let deletedCount = 0;
          let deletedSizeBytes = 0;
          
          const chunkSize = 50;
          for (let i = 0; i < Contents.length; i += chunkSize) {
            const chunk = Contents.slice(i, i + chunkSize);

            await Promise.all(chunk.map(async (item) => {
              if (!item.Key) return;
              
              const fileName = item.Key; 
              
              const { rows: postCheck } = await sql`SELECT id FROM posts WHERE content LIKE ${'%' + fileName + '%'} LIMIT 1`;
              const { rows: commentCheck } = await sql`SELECT id FROM comments WHERE content LIKE ${'%' + fileName + '%'} OR image_data LIKE ${'%' + fileName + '%'} LIMIT 1`;
              const { rows: userCheck } = await sql`SELECT user_id FROM users WHERE profile_image LIKE ${'%' + fileName + '%'} LIMIT 1`;

              if (postCheck.length === 0 && commentCheck.length === 0 && userCheck.length === 0) {
                r2KeysToDelete.push({ Key: item.Key }); 
                deletedCount++;
                deletedSizeBytes += (item.Size || 0);
              }
            }));
          }

          if (r2KeysToDelete.length > 0) {
            for (let i = 0; i < r2KeysToDelete.length; i += 1000) {
              const deleteChunk = r2KeysToDelete.slice(i, i + 1000);
              await s3.send(new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: { Objects: deleteChunk }
              }));
            }
          }
          
          finalCount = deletedCount;
          finalSizeMB = (deletedSizeBytes / 1024 / 1024).toFixed(2);
        }
      }
    } catch (error) {
      console.error("유령 파일 청소 에러:", error);
    }
    
    redirect(`/admin/monitor?cleared=true&count=${finalCount}&size=${finalSizeMB}&t=${Date.now()}`);
  };

  const emergencyDeleteJunkPosts = async () => {
    'use server';
    try {
      await sql`DELETE FROM posts WHERE likes = 0 AND views < 50 AND (SELECT count(*) FROM comments c WHERE c.post_id = posts.id) = 0 ORDER BY date ASC LIMIT 10`;
      revalidatePath('/admin/monitor');
    } catch(e) {}
  };

  const clearBlindedPosts = async () => {
    'use server';
    try {
      await sql`DELETE FROM posts WHERE is_blinded = true`;
      revalidatePath('/admin/monitor');
    } catch(e) {}
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 font-sans p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-700 pb-4 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-emerald-400 flex items-center gap-2">🖥️ 오재미 종합 모니터링 관제센터</h1>
            <p className="text-slate-400 text-sm mt-1 font-bold">오직 최고 관리자만 접근할 수 있는 1급 보안 구역입니다.</p>
          </div>
          <Link href="/" className="px-5 py-2 bg-slate-800 text-white font-bold rounded-sm border border-slate-600 hover:bg-slate-700 transition-colors shrink-0">&larr; 사이트로 돌아가기</Link>
        </div>

        {searchParams?.cleared === 'true' && (
          <div key={searchParams?.t} className="bg-emerald-900/40 border border-emerald-500/50 p-5 rounded-md mb-8 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🧹</div>
              <div>
                <h3 className="text-emerald-300 font-black text-lg">싹쓸이 청소 작전 완료!</h3>
                <p className="text-slate-300 text-sm mt-1">총 <span className="text-white font-black text-[15px]">{searchParams.count}개</span>의 유령 파일 (약 <span className="text-white font-black text-[15px]">{searchParams.size} MB</span>)을 소각하여 서버 용량을 즉시 확보했습니다.</p>
              </div>
            </div>
            <Link href="/admin/monitor" className="px-5 py-2 bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 font-bold text-sm rounded transition-colors shrink-0">확인 (닫기)</Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-md shadow-lg flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6">🗄️ 방명록 (게시글 DB)</h2>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>사용량: {dbSizeMB} MB</span>
              <span className="text-slate-400">최대: {maxDbMB} MB</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-6 relative overflow-hidden border border-slate-700">
              <div className={`h-full transition-all duration-1000 ${Number(dbUsagePercent) > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${dbUsagePercent}%` }}></div>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-difference">{dbUsagePercent}% 사용 중</span>
            </div>
          </div>

          <div className="bg-slate-800 border border-sky-500/50 p-6 rounded-md shadow-lg flex flex-col">
            <h2 className="text-lg font-bold text-sky-400 mb-6">☁️ 미디어 창고 (Cloudflare R2)</h2>
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>사용량: {r2SizeMB} MB</span>
              <span className="text-slate-400">총 {r2Count}개 파일</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-6 relative overflow-hidden border border-slate-700">
              <div className={`h-full transition-all duration-1000 ${Number(r2UsagePercent) > 80 ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${r2UsagePercent}%` }}></div>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-difference">{r2UsagePercent}% 사용 중</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-bold text-blue-300 mb-4">📈 데이터 세부 현황</h3>
            <ul className="space-y-4 font-bold text-[15px]">
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700"><span>📝 총 게시글</span><span className="text-white">{totalPosts} 개</span></li>
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700"><span>💬 총 댓글</span><span className="text-white">{totalComments} 개</span></li>
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700"><span className="text-rose-400">🚨 블라인드 글</span><span className="text-rose-400">{blindPosts} 개</span></li>
            </ul>
          </div>

          <div className="bg-rose-900/10 border border-rose-900/50 p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-bold text-rose-400 mb-4">🚨 서버 비상 조치</h3>
            <div className="space-y-3">
              <form action={cleanUpGhostFiles}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-sky-600/50 rounded text-left transition-colors">
                  <div>
                    <div className="text-sky-400 font-black text-[14px]">🌀 미디어 창고 '유령 파일' 싹쓸이 청소</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">DB에 등록되지 않은 고아 파일을 찾아 즉시 삭제합니다.</div>
                  </div>
                  <span className="text-sky-400">▶</span>
                </button>
              </form>
              <form action={emergencyDeleteJunkPosts}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-left transition-colors">
                  <div className="text-orange-400 font-black text-[14px]">🧹 조회수 낮은 유령 게시글 10개 삭제</div>
                  <span className="text-orange-400">▶</span>
                </button>
              </form>
              <form action={clearBlindedPosts}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-left transition-colors">
                  <div className="text-rose-500 font-black text-[14px]">🔥 블라인드 게시글 전체 영구 삭제</div>
                  <span className="text-rose-500">▶</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}