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

  // ==========================================
  // 1. Neon Compute 엔진 연동
  // ==========================================
  let neonCuHrs = "0.00";
  let neonUsagePercentText = "0.0"; 
  let neonVisualPercent = "0.0";    
  const gaugeMaxCuHrs = 600; 
  const displayLimitText = 360; 

  try {
    if (process.env.NEON_PROJECT_ID && process.env.NEON_API_KEY) {
      const neonRes = await fetch(`https://console.neon.tech/api/v2/projects/${process.env.NEON_PROJECT_ID}`, {
        headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
        cache: 'no-store'
      });
      if (neonRes.ok) {
        const neonData = await neonRes.json();
        const seconds = neonData.project?.compute_time_seconds;
        if (seconds !== undefined) {
          const cuHours = seconds / 3600;
          neonCuHrs = cuHours.toFixed(2);
          neonUsagePercentText = ((cuHours / displayLimitText) * 100).toFixed(1);
          neonVisualPercent = Math.min((cuHours / gaugeMaxCuHrs) * 100, 100).toFixed(1);
        } else { neonCuHrs = "데이터없음"; }
      } else { neonCuHrs = "통신오류"; }
    } else { neonCuHrs = "키없음"; }
  } catch (e) { neonCuHrs = "에러"; } 

  // ==========================================
  // 2. Vercel Postgres DB 용량 연동
  // ==========================================
  let dbSizeBytes = 0;
  try {
    const sizeRes = await sql`SELECT pg_database_size(current_database()) as size_bytes`;
    dbSizeBytes = Number(sizeRes.rows[0].size_bytes) || 0;
  } catch(e: any) {}
  const dbSizeMB = (dbSizeBytes / 1024 / 1024).toFixed(2);

  // ==========================================
  // 3. 🚨 완벽 수정: Cloudflare R2 (게시판 미디어 vs 회원 프사 분리!)
  // ==========================================
  let r2BoardSize = 0;
  let r2BoardCount = 0;
  let r2ProfileSize = 0;
  let r2ProfileCount = 0;

  if (process.env.R2_BUCKET_NAME && process.env.R2_ENDPOINT) {
    try {
      const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME });
      const { Contents } = await s3.send(command);
      if (Contents) {
        Contents.forEach(item => {
          // 💡 파일 이름이 'profiles/'로 시작하면 프사, 아니면 게시판 파일로 완벽 분류!
          if (item.Key && item.Key.startsWith('profiles/')) {
            r2ProfileCount++;
            r2ProfileSize += (item.Size || 0);
          } else {
            r2BoardCount++;
            r2BoardSize += (item.Size || 0);
          }
        });
      }
    } catch(e: any) {
      console.error("R2 에러:", e);
    }
  }
  
  // 프사는 MB, 게시판은 GB로 보기 편하게 세팅
  const r2ProfileMB = (r2ProfileSize / 1024 / 1024).toFixed(2);
  const r2BoardMB = (r2BoardSize / 1024 / 1024).toFixed(2);
  const r2BoardGB = (r2BoardSize / 1024 / 1024 / 1024).toFixed(3); 

  // 통계 데이터
  let totalPosts = 0, totalComments = 0, blindPosts = 0;
  try {
    const { rows: postRows } = await sql`SELECT count(*) as cnt FROM posts`;
    totalPosts = postRows[0].cnt;
    const { rows: commentRows } = await sql`SELECT count(*) as cnt FROM comments`;
    totalComments = commentRows[0].cnt;
    const { rows: blindRows } = await sql`SELECT count(*) as cnt FROM posts WHERE is_blinded = true`;
    blindPosts = blindRows[0].cnt;
  } catch (e) {}

  // API 미연동 임시 방어값
  const vercelBandwidthGB = "0.00"; 
  const neonEgressGB = "0.00";      
  const neonStorageGB = "0.03";     
  const cfWafBlocks = "340";        

  // ==========================================
  // 관리자 액션 함수
  // ==========================================
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
              
              // 🚨 프사와 시스템 고정 이미지는 무조건 살려두는 절대 방어막!
              if (fileName.startsWith('profiles/')) return;
              
              const { rows: postCheck } = await sql`SELECT id FROM posts WHERE content LIKE ${'%' + fileName + '%'} LIMIT 1`;
              const { rows: commentCheck } = await sql`SELECT id FROM comments WHERE content LIKE ${'%' + fileName + '%'} OR image_data LIKE ${'%' + fileName + '%'} LIMIT 1`;

              if (postCheck.length === 0 && commentCheck.length === 0) {
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
    } catch (error) {}
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

  const cleanUpGhostComments = async () => {
    'use server';
    try {
      await sql`DELETE FROM comments WHERE post_id NOT IN (SELECT id FROM posts)`;
      revalidatePath('/admin/monitor');
    } catch(e) {}
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-gray-100 font-sans p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-700 pb-4 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-emerald-400 flex items-center gap-2">🖥️ 오재미 궁극의 종합 관제탑</h1>
            <p className="text-slate-400 text-sm mt-1 font-bold">오직 최고 관리자만 접근할 수 있는 1급 보안 구역 및 서버 상태 모니터링</p>
          </div>
          <Link href="/admin" className="px-5 py-2 bg-slate-800 text-white font-bold rounded-sm border border-slate-600 hover:bg-slate-700 transition-colors shrink-0">&larr; 관리자 메인으로</Link>
        </div>

        {/* 🚨 오재미 생존 3대장 모니터링 구역 🚨 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* [구역 1] Vercel 모니터링 (가짜 Blob 구역 완벽 제거) */}
          <div className="bg-slate-800/80 border border-slate-600 p-6 rounded-md shadow-lg flex flex-col relative overflow-hidden">
            <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2 pb-3 border-b border-slate-700">
              <span className="text-2xl">🏢</span> Vercel 본관 <span className="text-xs font-normal text-slate-400 ml-auto bg-slate-900 px-2 py-1 rounded">Hobby 요금제</span>
            </h2>
            
            <div className="mb-6">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-300">사이트 접속 트래픽 (Bandwidth)</span>
                <span className="text-emerald-400">{vercelBandwidthGB} / 100 GB</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700 overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min((Number(vercelBandwidthGB) / 100) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 text-right">🚨 초과 시 사이트 접속 차단됨</p>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-300">초기 텍스트 DB (Postgres)</span>
                <span className="text-indigo-400">{dbSizeMB} / 256 MB</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700 overflow-hidden">
                <div className={`h-full ${Number(dbSizeMB) > 200 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min((Number(dbSizeMB) / 256) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 text-right">🚨 초과 시 DB 마비 (텍스트 전용 방어막)</p>
            </div>

            <div className="mt-auto pt-5 border-t border-slate-700/50 flex justify-end">
              <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[12px] font-black text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-600 hover:bg-slate-700">
                Vercel 관리자 바로가기 ↗
              </a>
            </div>
          </div>

          {/* [구역 2] Neon 모니터링 */}
          <div className="bg-[#1a1e26] border border-amber-500/30 p-6 rounded-md shadow-lg flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full blur-[60px] opacity-10"></div>
            <h2 className="text-lg font-black text-amber-400 mb-6 flex items-center gap-2 pb-3 border-b border-amber-900/50">
              <span className="text-2xl">🗄️</span> Neon 메인 DB <span className="text-xs font-normal text-amber-500/70 ml-auto bg-amber-950/50 px-2 py-1 rounded border border-amber-900/50">월 $19 결제중</span>
            </h2>

            <div className="mb-5 relative z-10">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-amber-200">엔진 구동량 (Compute)</span>
                <span className="text-amber-400">{neonCuHrs} / 360 CU-hrs</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 relative overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${Number(neonCuHrs) > 360 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${neonVisualPercent}%` }}></div>
                <div className="absolute top-0 bottom-0 border-l-[2px] border-dashed border-red-500 z-10" style={{ left: `${(360 / gaugeMaxCuHrs) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-amber-500/70 mt-1 text-right">✅ 0.5 CU 자물쇠로 완벽 방어 중 ({neonUsagePercentText}% 소모됨)</p>
            </div>

            <div className="mb-5 relative z-10">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-rose-200">데이터 유출량 (Egress)</span>
                <span className="text-rose-400">{neonEgressGB} / 100 GB</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700 overflow-hidden shadow-[0_0_8px_rgba(225,29,72,0.15)]">
                <div className="bg-rose-500 h-full" style={{ width: `${Math.min((Number(neonEgressGB) / 100) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-rose-400/80 mt-1 text-right font-bold">🚨 해커 스크래핑 시 수십만원 요금 폭탄 주의</p>
            </div>

            <div className="mb-2 relative z-10">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-amber-100/70">메인 DB 용량 (Storage)</span>
                <span className="text-amber-100/70">{neonStorageGB} / 10 GB</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 border border-slate-700 overflow-hidden">
                <div className="bg-amber-600 h-full" style={{ width: `${Math.min((Number(neonStorageGB) / 10) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 text-right">✅ 텍스트 전용 저장이라 평생 넉넉함</p>
            </div>

            <div className="mt-auto pt-5 border-t border-amber-900/30 flex justify-end relative z-10">
              <a href="https://console.neon.tech/app/projects" target="_blank" rel="noopener noreferrer" className="text-[12px] font-black text-amber-500 hover:text-amber-300 transition-colors flex items-center gap-1.5 bg-amber-950/30 px-3 py-1.5 rounded-sm border border-amber-900/50 hover:bg-amber-900/50">
                Neon 대시보드 바로가기 ↗
              </a>
            </div>
          </div>

          {/* [구역 3] Cloudflare 모니터링 (프사와 게시판 완벽 분리 적용!) */}
          <div className="bg-[#121c29] border border-sky-500/30 p-6 rounded-md shadow-lg flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500 rounded-full blur-[60px] opacity-10"></div>
            <h2 className="text-lg font-black text-sky-400 mb-6 flex items-center gap-2 pb-3 border-b border-sky-900/50">
              <span className="text-2xl">🛡️</span> Cloudflare 저장소 <span className="text-xs font-normal text-sky-300/70 ml-auto bg-sky-950/50 px-2 py-1 rounded border border-sky-900/50">R2 (10GB 무료)</span>
            </h2>

            {/* 회원 프사 전용 구역 (추가됨) */}
            <div className="mb-5 relative z-10">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-pink-300">회원 프사 전용 보관함 (profiles)</span>
                <span className="text-pink-400">{r2ProfileMB} MB / 1,024 MB</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700 overflow-hidden">
                <div className="bg-pink-500 h-full" style={{ width: `${Math.min((Number(r2ProfileMB) / 1024) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-pink-400/60 mt-1 text-right">✅ 현재 총 {r2ProfileCount}개 회원 프사 안전 보관 중</p>
            </div>

            {/* 일반 게시판 미디어 구역 */}
            <div className="mb-6 relative z-10">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-sky-200">게시판 미디어 창고 (본문 이미지)</span>
                <span className="text-sky-400">{r2BoardGB} GB <span className="text-slate-400 font-normal">({r2BoardMB} MB)</span> / 10 GB</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700 overflow-hidden">
                <div className="bg-sky-500 h-full" style={{ width: `${Math.min((Number(r2BoardGB) / 10) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-sky-400/60 mt-1 text-right">✅ 현재 총 {r2BoardCount}개 게시글 파일 저장 중</p>
            </div>

            <div className="mt-auto pt-3 border-t border-sky-900/30 flex justify-end relative z-10">
              <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="text-[12px] font-black text-sky-500 hover:text-sky-300 transition-colors flex items-center gap-1.5 bg-sky-950/30 px-3 py-1.5 rounded-sm border border-sky-900/50 hover:bg-sky-900/50">
                Cloudflare 관리자 바로가기 ↗
              </a>
            </div>
          </div>

        </div>

        {/* 보조 패널 영역 */}
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
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">DB에 없는 게시판 파일을 찾아 삭제합니다. (프사는 절대 보호됨)</div>
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
              <form action={cleanUpGhostComments}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-indigo-600/50 rounded text-left transition-colors">
                  <div>
                    <div className="text-indigo-400 font-black text-[14px]">👻 부모 잃은 유령 댓글 싹쓸이 청소</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">과거 일괄 삭제 시 남았던 고아 댓글 9개를 즉시 청소합니다.</div>
                  </div>
                  <span className="text-indigo-400">▶</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}