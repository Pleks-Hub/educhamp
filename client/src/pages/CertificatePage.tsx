/**
 * CertificatePage — Public shareable certificate view
 *
 * Route: /certificate/:token
 * No authentication required.
 */

import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, Share2, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function CertificatePage() {
  const { token } = useParams<{ token: string }>();
  const { data: cert, isLoading, error } = trpc.certificate.getPublic.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const handleDownloadPDF = () => {
    window.open(`/api/certificate/${token}/pdf`, "_blank");
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `EduChamp Certificate — ${cert?.courseTitle}`,
          text: `${cert?.studentName} completed ${cert?.courseTitle} on EduChamp!`,
          url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!", { description: "Certificate link copied to clipboard." });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-3/4 mx-auto bg-white/10" />
          <Skeleton className="h-8 w-1/2 mx-auto bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Award className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Certificate Not Found</h1>
          <p className="text-slate-400 max-w-sm">
            This certificate link is invalid or may have been removed. Please check the URL and try again.
          </p>
          <Link href="/">
            <Button variant="outline" className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10">
              Go to EduChamp
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const gradeLabel =
    cert.gradeLevel === "Pre-K"
      ? "Pre-Kindergarten"
      : cert.gradeLevel === "Kindergarten"
      ? "Kindergarten"
      : `Grade ${cert.gradeLevel}`;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 sm:p-8">
      {/* EduChamp branding header */}
      <div className="mb-8 text-center">
        <Link href="/">
          <span className="text-indigo-400 font-bold text-lg tracking-wide hover:text-indigo-300 transition-colors cursor-pointer">
            ✦ EduChamp
          </span>
        </Link>
      </div>

      {/* Certificate card */}
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)",
          border: "2px solid #4f46e5",
          boxShadow: "0 0 60px rgba(99, 102, 241, 0.2), 0 0 120px rgba(99, 102, 241, 0.08)",
        }}
      >
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

        <div className="p-8 sm:p-12 text-center space-y-6">
          {/* Badge icon */}
          <div className="flex justify-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)",
              }}
            >
              <Award className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Header text */}
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.25em] text-indigo-400 uppercase">
              EduChamp Adaptive Learning Platform
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Certificate of Completion
            </h1>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 justify-center">
            <div className="h-px w-16 bg-indigo-500/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <div className="h-px w-16 bg-indigo-500/40" />
          </div>

          {/* Body */}
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">This certifies that</p>
            <p className="text-3xl sm:text-4xl font-bold italic text-indigo-300">
              {cert.studentName}
            </p>
            <p className="text-slate-400 text-sm">has successfully completed</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{cert.courseTitle}</h2>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge
                className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-xs"
                variant="outline"
              >
                {gradeLabel}
              </Badge>
              <Badge
                className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs"
                variant="outline"
              >
                {cert.subject}
              </Badge>
            </div>
          </div>

          {/* Mastery score */}
          <div className="inline-flex items-center gap-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl px-6 py-3">
            <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="text-left">
              <p className="text-xs text-slate-400">Average Mastery Score</p>
              <p className="text-xl font-bold text-indigo-300">{cert.averageMastery}%</p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span>Issued on</span>
              <span className="text-slate-300 font-medium">{issuedDate}</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span>ID:</span>
              <span className="text-slate-400">{token?.slice(0, 16)}…</span>
            </div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
        <Button
          onClick={handleDownloadPDF}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          className="flex-1 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share Certificate
        </Button>
        <Link href="/">
          <Button
            variant="outline"
            className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-800 gap-2 w-full"
          >
            <ExternalLink className="w-4 h-4" />
            Visit EduChamp
          </Button>
        </Link>
      </div>

      {/* Verification note */}
      <p className="mt-4 text-xs text-slate-600 text-center max-w-md">
        This certificate can be independently verified using the certificate ID above.
        Issued by EduChamp Adaptive Learning Platform.
      </p>
    </div>
  );
}
