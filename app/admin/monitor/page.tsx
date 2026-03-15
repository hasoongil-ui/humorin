// @ts-nocheck
import { sql } from '@vercel/postgres';
import { list } from '@vercel/blob'; 
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'; 
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

export default async function MonitorControlCenter() {
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

  // ==========================================
  // 1. [제 1창고] 텍스트 데이터베이스 용량 (Postgres)
  // ==========================================
  let dbSizeBytes = 0;
  let dbError = null;
  try {
    const sizeRes = await sql`SELECT pg_database_size(current_database()) as size_bytes`;
    dbSizeBytes = Number(sizeRes.rows[0].size_bytes) || 0;
  } catch(e: any) { 
    dbError = `🚨 DB 연결 실패: ${e.message}`;
    console.error("DB 용량 측정 실패", e); 
  }

  const dbSizeMB = (dbSizeBytes / 1024 / 1024).toFixed(2);
  const maxDbMB = 256; 
  const dbUsagePercent = Math.min((parseFloat(dbSizeMB) / maxDbMB) * 100, 100).toFixed(1);

  // ==========================================
  // 2. [제 2창고] Vercel Blob 용량 (보조 미디어)
  // ==========================================
  let blobSize = 0;
  let blobCount = 0;
  let blobError = null; // 💡 [수술] 에러 내용을 담을 변수 추가!
  
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // 💡 [수술] 대충 숨기지 않고 정확히 뭐가 문제인지 짚어줍니다!
    blobError = "🚨 BLOB_READ_WRITE_TOKEN 환경변수가 누락되었습니다. Vercel 대시보드에서 토큰을 확인해 주십시오.";
  } else {
    try {
      const { blobs } = await list();
      blobCount = blobs.length;
      blobSize = blobs.reduce((acc, blob) => acc + blob.size, 0);
    } catch(e: any) { 
      blobError = `🚨 통신 에러 발생: ${e.message}`;
      console.error("Blob 미디어 용량 측정 실패", e); 
    }
  }

  const blobSizeMB = (blobSize / 1024 / 1024).toFixed(2);
  const maxBlobMB = 250; 
  const blobUsagePercent = Math.min((parseFloat(blobSizeMB) / maxBlobMB) * 100, 100).toFixed(1);

  // ==========================================
  // 3. [제 3창고] 진짜 미디어 메인 창고 (Cloudflare R2)
  // ==========================================
  let r2Size = 0;
  let r2Count = 0;
  let r2Error = null;

  if (!process.env.R2_BUCKET_NAME || !process.env.R2_ENDPOINT) {
    r2Error = "🚨 R2_BUCKET_NAME 등의 환경변수가 누락되었습니다. 설정 파일을 확인해 주십시오.";
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
      console.error("R2 미디어 용량 측정 실패", e); 
    }
  }

  const r2SizeMB = (r2Size / 1024 / 1024).toFixed(2);
  const maxR2MB = 10240; // 10GB
  const r2UsagePercent = Math.min((parseFloat(r2SizeMB) / maxR2MB) * 100, 100).toFixed(1);

  // ==========================================
  // 4. 현재 쌓인 데이터 통계
  // ==========================================
  let totalPosts = 0, totalComments = 0, blindPosts = 0;
  try {
    const { rows: postRows } = await sql`SELECT count(*) as cnt FROM posts`;
    totalPosts = postRows[0].cnt;
    const { rows: commentRows } = await sql`SELECT count(*) as cnt FROM comments`;
    totalComments = commentRows[0].cnt;
    const { rows: blindRows } = await sql`SELECT count(*) as cnt FROM posts WHERE is_blinded = true`;
    blindPosts = blindRows[0].cnt;
  } catch (e) {}

  // ---------------------------------------------------------
  // 🚨 [비상 버튼 동작 (서버 액션)] 
  // ---------------------------------------------------------
  const emergencyDeleteJunkPosts = async () => {
    'use server';
    try {
      await sql`
        DELETE FROM posts 
        WHERE id IN (
          SELECT p.id FROM posts p
          WHERE p.likes = 0 AND p.views < 50 AND (SELECT count(*) FROM comments c WHERE c.post_id = p.id) = 0
          ORDER BY p.date ASC LIMIT 10
        )
      `;
      revalidatePath('/admin/monitor');
    } catch(e) { console.error(e); }
  };

  const clearBlindedPosts = async () => {
    'use server';
    try {
      await sql`DELETE FROM posts WHERE is_blinded = true`;
      revalidatePath('/admin/monitor');
    } catch(e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 font-sans p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* 헤더 부분 */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-700 pb-4 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-emerald-400 flex items-center gap-2">
              🖥️ 오재미 종합 모니터링 관제센터
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-bold">오직 최고 관리자만 접근할 수 있는 1급 보안 구역입니다.</p>
          </div>
          <Link href="/" className="px-5 py-2 bg-slate-800 text-white font-bold rounded-sm border border-slate-600 hover:bg-slate-700 transition-colors shrink-0">
            &larr; 사이트로 돌아가기
          </Link>
        </div>

        {/* 1. 시스템 현황 패널 (트리플 모니터링) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* [1] 데이터베이스 */}
          <div className={`bg-slate-800 border ${dbError ? 'border-red-500 shadow-red-900/50' : 'border-slate-700'} p-6 rounded-md shadow-lg flex flex-col`}>
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">🗄️ 방명록 (게시글 DB)</h2>
            {dbError ? (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-sm text-xs font-bold leading-relaxed">
                {dbError}
              </div>
            ) : (
              <>
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span className="text-slate-300">사용량: <span className="text-white text-lg">{dbSizeMB} MB</span></span>
                  <span className="text-slate-400">최대: {maxDbMB} MB</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-6 mb-2 overflow-hidden border border-slate-700 relative">
                  <div className={`h-6 rounded-full transition-all duration-1000 ${Number(dbUsagePercent) > 80 ? 'bg-red-500' : Number(dbUsagePercent) > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${dbUsagePercent}%` }}></div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-difference">{dbUsagePercent}% 사용 중</span>
                </div>
              </>
            )}
            <p className="text-[11px] text-slate-400 font-medium mt-auto pt-4">※ 텍스트만 저장되므로 천천히 증가합니다.</p>
          </div>

          {/* [2] Vercel Blob */}
          <div className={`bg-slate-800 border ${blobError ? 'border-orange-500 shadow-orange-900/50' : 'border-slate-700'} p-6 rounded-md shadow-lg flex flex-col`}>
            <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${blobError ? 'text-orange-400' : 'text-indigo-400'}`}>
              🧊 보조 미디어 (Vercel Blob)
            </h2>
            {blobError ? (
              <div className="bg-orange-900/20 border border-orange-500/30 text-orange-300 p-3 rounded-sm text-xs font-bold leading-relaxed whitespace-pre-wrap">
                {blobError}
              </div>
            ) : (
              <>
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span className="text-slate-300">사용량: <span className="text-white text-lg">{blobSizeMB} MB</span></span>
                  <span className="text-slate-400">총 <span className="text-white">{blobCount}</span>개 파일</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-6 mb-2 overflow-hidden border border-slate-700 relative">
                  <div className="h-6 rounded-full bg-indigo-500 transition-all duration-1000" style={{ width: `${blobUsagePercent}%` }}></div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-difference">
                    {blobUsagePercent}% 사용 중
                  </span>
                </div>
              </>
            )}
            <p className="text-[11px] text-slate-400 font-medium mt-auto pt-4">※ 만약의 경우를 대비한 보조 저장소입니다.</p>
          </div>

          {/* [3] Cloudflare R2 */}
          <div className={`bg-slate-800 border ${r2Error ? 'border-red-500 shadow-red-900/50' : 'border-sky-500/50'} p-6 rounded-md shadow-lg flex flex-col`}>
            <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${r2Error ? 'text-red-400' : 'text-sky-400'}`}>
              ☁️ 메인 미디어 (Cloudflare R2)
            </h2>
            {r2Error ? (
              <div className="bg-red-900/20 border border-red-500/30 text-red-300 p-3 rounded-sm text-xs font-bold leading-relaxed whitespace-pre-wrap">
                {r2Error}
              </div>
            ) : (
              <>
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span className="text-slate-300">사용량: <span className="text-white text-lg">{r2SizeMB} MB</span></span>
                  <span className="text-slate-400">총 <span className="text-white">{r2Count}</span>개 파일</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-6 mb-2 overflow-hidden border border-slate-700 relative">
                  <div className={`h-6 rounded-full transition-all duration-1000 ${Number(r2UsagePercent) > 80 ? 'bg-red-500' : Number(r2UsagePercent) > 50 ? 'bg-yellow-500' : 'bg-sky-500'}`} style={{ width: `${r2UsagePercent}%` }}></div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-difference">{r2UsagePercent}% 사용 중</span>
                </div>
              </>
            )}
            <p className="text-[11px] text-sky-200 font-medium mt-auto pt-4">※ (최대 10GB) 오재미의 초거대 메인 미디어 창고입니다.</p>
          </div>

        </div>

        {/* 2. 데이터 세부 현황 & 긴급 조치 버튼들 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 현황 패널 */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-bold text-blue-300 mb-4">📈 현재 쌓인 데이터 현황</h3>
            <ul className="space-y-4 font-bold text-[15px]">
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700">
                <span className="text-slate-300">📝 등록된 총 게시글 수</span>
                <span className="text-white text-lg">{totalPosts} 개</span>
              </li>
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700">
                <span className="text-slate-300">💬 등록된 총 댓글 수</span>
                <span className="text-white text-lg">{totalComments} 개</span>
              </li>
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700">
                <span className="text-rose-400">🚨 블라인드(신고) 처리된 글</span>
                <span className="text-rose-400 text-lg">{blindPosts} 개</span>
              </li>
            </ul>
          </div>

          {/* 비상 조치 패널 */}
          <div className="bg-rose-900/10 border border-rose-900/50 p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-bold text-rose-400 mb-4 flex items-center gap-2">🚨 서버 비상 긴급 조치 스위치</h3>
            <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">
              용량이 가득 차서 서버가 위험할 때 누르는 버튼입니다. 누르는 즉시 복구할 수 없는 데이터 영구 삭제가 진행됩니다.
            </p>
            
            <div className="space-y-3">
              <form action={emergencyDeleteJunkPosts}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-left transition-colors group">
                  <div>
                    <div className="text-orange-400 font-black text-[14px]">🧹 유령 게시글 10개 영구 삭제</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">조회수 50 미만, 공감 0, 댓글 0 인 쓰레기 글만 지웁니다.</div>
                  </div>
                  <span className="text-orange-400 group-hover:scale-110 transition-transform">▶</span>
                </button>
              </form>

              <form action={clearBlindedPosts}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-left transition-colors group">
                  <div>
                    <div className="text-rose-500 font-black text-[14px]">🔥 블라인드 게시글 전체 영구 삭제</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">신고 누적으로 차단된 악성 글 {blindPosts}개를 일괄 삭제합니다.</div>
                  </div>
                  <span className="text-rose-500 group-hover:scale-110 transition-transform">▶</span>
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}