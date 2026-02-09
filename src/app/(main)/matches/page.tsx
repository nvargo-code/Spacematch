"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMatches, EnrichedMatch } from "@/hooks/useMatches";
import { useAuth } from "@/context/AuthProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Sparkles, ExternalLink, Zap } from "lucide-react";

function MatchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    paid: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    connected: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MatchCard({ match, userId }: { match: EnrichedMatch; userId: string }) {
  const isSeeker = match.seekerId === userId;
  const otherPostTitle = isSeeker ? match.landlordPostTitle : match.seekerPostTitle;
  const otherPostAuthor = isSeeker ? match.landlordPostAuthorName : match.seekerPostAuthorName;
  const otherPostId = isSeeker ? match.landlordPostId : match.seekerPostId;
  const myPostTitle = isSeeker ? match.seekerPostTitle : match.landlordPostTitle;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-accent shrink-0" />
              <h3 className="font-semibold text-foreground truncate">
                {otherPostTitle}
              </h3>
            </div>
            <p className="text-sm text-muted mb-2">by {otherPostAuthor}</p>

            <p className="text-xs text-muted">
              Matched with your post: <span className="text-foreground">{myPostTitle}</span>
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-accent">{match.matchScore}</div>
            <p className="text-xs text-muted">score</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <MatchStatusBadge status={match.status} />

          <div className="flex gap-2">
            <Link href={`/post/${otherPostId}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink size={14} className="mr-1" />
                View Post
              </Button>
            </Link>
            {match.status === "pending" && (
              <Button size="sm">
                <Zap size={14} className="mr-1" />
                Connect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MatchesPage() {
  const { firebaseUser } = useAuth();
  const { allMatches, loading, markMatchesSeen } = useMatches();

  // Mark all matches as seen when visiting this page
  useEffect(() => {
    if (allMatches.length > 0) {
      markMatchesSeen();
    }
  }, [allMatches, markMatchesSeen]);

  return (
    <AuthGuard requireRole>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Your Matches</h1>
          <p className="text-sm text-muted">
            Spaces and seekers that match your posts
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : allMatches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
                <Sparkles size={32} className="text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No matches yet
              </h2>
              <p className="text-sm text-muted mb-6 max-w-sm mx-auto">
                Create a post describing what you need or what you have to offer, and we&apos;ll find matches for you automatically.
              </p>
              <Link href="/post/new">
                <Button>Create a Post</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {allMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                userId={firebaseUser!.uid}
              />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
