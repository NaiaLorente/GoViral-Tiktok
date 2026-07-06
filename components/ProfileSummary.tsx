import type { CreatorProfileSummary } from "@/lib/tiktokProfile";

interface ProfileSummaryProps {
  summary: CreatorProfileSummary;
  /** Omit if no video links were submitted; pass an array (possibly empty) once the batch fetch has run. */
  videoTranscripts?: string[];
}

export default function ProfileSummary({ summary, videoTranscripts }: ProfileSummaryProps) {
  const hasVideoData = summary.topHashtags.length > 0 || summary.recentCaptionSamples.length > 0;
  const hasAnything = hasVideoData || summary.bio.length > 0 || summary.followerCount > 0;

  return (
    <div className="w-full max-w-xl rounded-xl border-2 border-[#111] px-4 py-3 text-sm">
      <p className="text-[#999] text-xs uppercase tracking-wide mb-2">
        What we read from @{summary.handle || "?"}
      </p>

      {!hasAnything ? (
        <p style={{ color: "#a67c00" }}>
          Nothing readable — not even a bio. Ideas below are based only on what you typed, not your real
          content.
        </p>
      ) : (
        <div className="space-y-1.5 text-[#333]">
          {summary.bio && <p>Bio: &ldquo;{summary.bio}&rdquo;</p>}
          {summary.followerCount > 0 && <p>Followers: {summary.followerCount.toLocaleString()}</p>}
          {summary.topHashtags.length > 0 && (
            <p>Hashtags you use: {summary.topHashtags.map((tag) => `#${tag}`).join(" ")}</p>
          )}
          {summary.avgEngagementRate > 0 && (
            <p>Avg. engagement rate: {(summary.avgEngagementRate * 100).toFixed(1)}%</p>
          )}
          {summary.recentCaptionSamples.length > 0 && (
            <div>
              <p>Recent captions:</p>
              <ul className="mt-1 space-y-0.5 text-[#666]">
                {summary.recentCaptionSamples.slice(0, 5).map((caption, i) => (
                  <li key={i}>&ldquo;{caption}&rdquo;</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {videoTranscripts !== undefined && (
        <div className="mt-2 pt-2 border-t-2 border-[#111]">
          {videoTranscripts.length > 0 ? (
            <div className="text-[#333]">
              <p>
                Spoken hook transcript found for {videoTranscripts.length} of your video
                {videoTranscripts.length === 1 ? "" : "s"} (first ~15s, from their caption/subtitle track):
              </p>
              <ul className="mt-1 space-y-0.5 text-[#666]">
                {videoTranscripts.slice(0, 5).map((transcript, i) => (
                  <li key={i}>&ldquo;{transcript}&rdquo;</li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={{ color: "#a67c00" }}>
              No spoken-hook transcript found on any of these videos — none of them appear to have a
              caption/subtitle track TikTok exposes, or it couldn&apos;t be fetched. Ideas below are grounded in
              captions/hashtags only, not what&apos;s actually said.
            </p>
          )}
        </div>
      )}

      {!hasVideoData && hasAnything && (
        <p className="mt-2" style={{ color: "#a67c00" }}>
          No captions, hashtags, or engagement data made it through — only a bio/follower count. Ideas below
          are inferred from that alone, not your actual videos. Pasting a few of your video links directly
          (above) is the more reliable way to ground ideas in your real content.
        </p>
      )}

      <p className="mt-2 text-xs text-[#999]">
        If this doesn&apos;t look like your real content, the ideas below won&apos;t either — let us know
        and we&apos;ll dig into the scraper.
      </p>
    </div>
  );
}
