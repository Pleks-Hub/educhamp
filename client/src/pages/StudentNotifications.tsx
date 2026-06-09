import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bell, Mail, Trophy, Clock, ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function StudentNotifications() {
  const [, navigate] = useLocation();
  const { data: prefs, isLoading } = trpc.student.getEmailPreferences.useQuery();
  const updateMutation = trpc.student.updateEmailPreferences.useMutation({
    onSuccess: () => {
      toast.success("Email preferences saved!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save preferences");
    },
  });

  const { user } = useAuth();
  const isParent = user?.accountType === "parent";
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [achievementsEnabled, setAchievementsEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [inviteRemindersEnabled, setInviteRemindersEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (prefs) {
      setDigestEnabled(prefs.emailDigestEnabled);
      setAchievementsEnabled(prefs.emailAchievementsEnabled);
      setRemindersEnabled(prefs.emailRemindersEnabled);
      setInviteRemindersEnabled(prefs.inviteRemindersEnabled);
    }
  }, [prefs]);

  useEffect(() => {
    if (prefs) {
      const changed =
        digestEnabled !== prefs.emailDigestEnabled ||
        achievementsEnabled !== prefs.emailAchievementsEnabled ||
        remindersEnabled !== prefs.emailRemindersEnabled ||
        inviteRemindersEnabled !== prefs.inviteRemindersEnabled;
      setHasChanges(changed);
    }
  }, [digestEnabled, achievementsEnabled, remindersEnabled, inviteRemindersEnabled, prefs]);

  function handleSave() {
    updateMutation.mutate({
      emailDigestEnabled: digestEnabled,
      emailAchievementsEnabled: achievementsEnabled,
      emailRemindersEnabled: remindersEnabled,
      inviteRemindersEnabled: inviteRemindersEnabled,
    });
    setHasChanges(false);
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Notifications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Choose which emails you'd like to receive from EduChamp
          </p>
        </div>
      </div>

      {/* Progress Digest */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Progress Digest</CardTitle>
                <CardDescription className="text-sm">
                  Weekly summary of your learning progress
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">Weekly</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="digest-toggle" className="text-sm text-muted-foreground">
              Receive weekly progress reports showing lessons completed, quiz scores, and skills mastered
            </Label>
            <Switch
              id="digest-toggle"
              checked={digestEnabled}
              onCheckedChange={setDigestEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">Achievements & Badges</CardTitle>
                <CardDescription className="text-sm">
                  Celebrations when you earn badges or reach milestones
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">Instant</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="achievements-toggle" className="text-sm text-muted-foreground">
              Get notified when you earn a new badge, complete a course, or hit a streak milestone
            </Label>
            <Switch
              id="achievements-toggle"
              checked={achievementsEnabled}
              onCheckedChange={setAchievementsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-base">Study Reminders</CardTitle>
                <CardDescription className="text-sm">
                  Gentle nudges when you haven't studied in a while
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">As needed</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="reminders-toggle" className="text-sm text-muted-foreground">
              Receive reminders after periods of inactivity to help you stay on track
            </Label>
            <Switch
              id="reminders-toggle"
              checked={remindersEnabled}
              onCheckedChange={setRemindersEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invite Reminders (parents only) */}
      {isParent && (
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Send className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Invite Expiry Reminders</CardTitle>
                  <CardDescription className="text-sm">
                    Alerts when student invites are about to expire
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">24h before</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="invite-reminders-toggle" className="text-sm text-muted-foreground">
                Receive an email reminder 24 hours before a student invite expires, so you can resend if needed
              </Label>
              <Switch
                id="invite-reminders-toggle"
                checked={inviteRemindersEnabled}
                onCheckedChange={setInviteRemindersEnabled}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          You can change these preferences at any time. We'll never share your email with third parties.
        </p>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="min-w-[100px]"
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <Separator />

      {/* Info footer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Bell className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">About email notifications</p>
          <p>
            These settings control the emails EduChamp sends to your inbox. In-app notifications
            (the bell icon in the sidebar) are always active and cannot be turned off.
            To unsubscribe from all emails, turn off all toggles above.
          </p>
        </div>
      </div>
    </div>
  );
}
