/**
 * Certificates — Student view of all earned course completion certificates
 *
 * Route: /certificates
 * Protected — student only
 */

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, Share2, ExternalLink, Trophy } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

function CertificateCard({
  cert,
}: {
  cert: {
    id: number;
    courseId: number;
    certificateToken: string;
    averageMastery: number;
    issuedAt: Date;
    courseTitle: string;
    courseCode: string;
    gradeLevel: string;
    subject: string;
  };
}) {
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/certificate/${cert.certificateToken}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `EduChamp Certificate — ${cert.courseTitle}`,
          text: `I completed ${cert.courseTitle} on EduChamp!`,
          url,
        });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!", { description: "Certificate link copied to clipboard." });
    }
  };

  return (
    <Card
      className="overflow-hidden border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-slate-900/60 hover:border-indigo-500/40 transition-all duration-200"
      style={{ boxShadow: "0 0 20px rgba(99, 102, 241, 0.08)" }}
    >
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{cert.courseTitle}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-400">
                {cert.courseCode}
              </Badge>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {cert.subject}
              </Badge>
            </div>
          </div>
        </div>

        {/* Mastery score + date */}
        <div className="flex items-center justify-between">
          <div className="bg-indigo-950/60 border border-indigo-500/20 rounded-lg px-3 py-1.5">
            <p className="text-xs text-slate-400">Mastery</p>
            <p className="text-lg font-bold text-indigo-300">{cert.averageMastery}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Issued</p>
            <p className="text-sm text-slate-300">{issuedDate}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs"
            onClick={() => window.open(`/api/certificate/${cert.certificateToken}/pdf`, "_blank")}
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 gap-1.5 text-xs"
            onClick={handleShare}
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
          <Link href={`/certificate/${cert.certificateToken}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-400 hover:bg-slate-800"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Certificates() {
  const { data: certs, isLoading } = trpc.certificate.getMyCertificates.useQuery();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Certificates</h1>
            <p className="text-slate-400 text-sm">
              Earn a certificate by achieving 90%+ average mastery across all units in a course.
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl bg-white/5" />
            ))}
          </div>
        ) : !certs || certs.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)" }}
            >
              <Award className="w-10 h-10 text-indigo-400/50" />
            </div>
            <h2 className="text-xl font-semibold text-slate-300">No Certificates Yet</h2>
            <p className="text-slate-500 max-w-sm mx-auto">
              Complete all units in a course with 90%+ average mastery to earn your first certificate.
            </p>
            <Link href="/curriculum">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white mt-2">
                Go to Curriculum
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm">
              You have earned{" "}
              <span className="text-indigo-300 font-semibold">{certs.length}</span>{" "}
              {certs.length === 1 ? "certificate" : "certificates"}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {certs.map((cert) => (
                <CertificateCard key={cert.id} cert={cert} />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
