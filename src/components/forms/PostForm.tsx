"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import { createPost } from "@/lib/firebase/firestore";
import { postSchema, PostFormData } from "@/lib/utils/validators";
import {
  SIZE_OPTIONS,
  ENVIRONMENT_OPTIONS,
  UTILITY_OPTIONS,
  DURATION_OPTIONS,
  PRIVACY_OPTIONS,
  NOISE_OPTIONS,
  USER_TYPE_OPTIONS,
} from "@/types/attributes";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { TagGroup } from "@/components/ui/TagGroup";
import { ImageUploader } from "./ImageUploader";
import { LocationPicker } from "./LocationPicker";
import { MatchCelebration } from "@/components/ui/MatchCelebration";
import { cn } from "@/lib/utils";
import { MatchResult } from "@/types";
import { Search, Building2, ChevronLeft, ChevronRight } from "lucide-react";

const STEPS = [
  { id: 1, title: "Basics", description: "What are you looking for?" },
  { id: 2, title: "Details", description: "Describe your needs" },
  { id: 3, title: "Attributes", description: "Space requirements" },
  { id: 4, title: "Images", description: "Add photos" },
];

export function PostForm() {
  const router = useRouter();
  const { firebaseUser, user } = useAuth();
  const { success, error: showError } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      type: user?.role === "landlord" ? "space" : "need",
      title: "",
      description: "",
      images: [],
      attributes: {
        utilities: [],
        userTypes: [],
        customTags: [],
      },
    },
  });

  const postType = watch("type");

  const canPost = user && (user.activePostCount < 3 || user.extraPostCredits > 0);

  const onSubmit = async (data: PostFormData) => {
    // Prevent submission if not on final step
    if (step !== STEPS.length) {
      console.log("Blocked submission - not on final step");
      return;
    }

    // Prevent double submission
    if (loading) return;

    if (!firebaseUser || !user) return;

    if (!canPost) {
      showError("You've reached your post limit. Delete a post or purchase extra slots.");
      return;
    }

    setLoading(true);
    try {
      const postId = await createPost(
        firebaseUser.uid,
        user.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Anonymous",
        user.photoURL || firebaseUser.photoURL || undefined,
        data
      );
      success("Post created successfully!");

      // Trigger matching for need/space posts
      if (data.type === "need" || data.type === "space") {
        try {
          const matchRes = await fetch("/api/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId, userId: firebaseUser.uid }),
          });
          if (matchRes.ok) {
            const matchData = await matchRes.json();
            if (matchData.matches && matchData.matches.length > 0) {
              setMatchResults(matchData.matches);
              setPendingPostId(postId);
              setShowCelebration(true);
              return; // Don't navigate yet — celebration will handle it
            }
          }
        } catch {
          // Matching failure is non-fatal
        }
      }

      router.push(`/post/${postId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create post";
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                I want to...
              </label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "need", icon: Search, label: "Find a Space", desc: "I'm looking for a creative space" },
                  { value: "space", icon: Building2, label: "List a Space", desc: "I have a space to offer" },
                ].map((option) => {
                  const Icon = option.icon;
                  const isSelected = postType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue("type", option.value as "need" | "space")}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        isSelected
                          ? "border-accent bg-accent/10"
                          : "border-border bg-card hover:border-accent/50"
                      )}
                    >
                      <Icon
                        size={24}
                        className={isSelected ? "text-accent" : "text-muted"}
                      />
                      <h3 className="font-semibold text-foreground mt-2">{option.label}</h3>
                      <p className="text-xs text-muted mt-1">{option.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Title"
              placeholder={postType === "need" ? "Looking for a band practice space..." : "Warehouse studio available..."}
              error={errors.title?.message}
              {...register("title")}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Textarea
              label="Description"
              placeholder={
                postType === "need"
                  ? "Describe what you're looking for, how you'll use the space, and any specific requirements..."
                  : "Describe your space, what makes it unique, and what it's best suited for..."
              }
              error={errors.description?.message}
              className="min-h-[200px]"
              {...register("description")}
            />

            <Controller
              name="attributes.location"
              control={control}
              render={({ field }) => (
                <LocationPicker
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Controller
              name="attributes.sizeCategory"
              control={control}
              render={({ field }) => (
                <TagGroup
                  label="Space Size"
                  options={SIZE_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} (${o.description})` }))}
                  selected={field.value ? [field.value] : []}
                  onChange={(vals) => field.onChange(vals[0] || undefined)}
                  multiple={false}
                />
              )}
            />

            <Controller
              name="attributes.environment"
              control={control}
              render={({ field }) => (
                <TagGroup
                  label="Environment"
                  options={ENVIRONMENT_OPTIONS}
                  selected={field.value ? [field.value] : []}
                  onChange={(vals) => field.onChange(vals[0] || undefined)}
                  multiple={false}
                />
              )}
            />

            <Controller
              name="attributes.utilities"
              control={control}
              render={({ field }) => (
                <TagGroup
                  label="Utilities Needed"
                  options={UTILITY_OPTIONS}
                  selected={field.value || []}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              name="attributes.duration"
              control={control}
              render={({ field }) => (
                <TagGroup
                  label="Duration"
                  options={DURATION_OPTIONS}
                  selected={field.value ? [field.value] : []}
                  onChange={(vals) => field.onChange(vals[0] || undefined)}
                  multiple={false}
                />
              )}
            />

            <Controller
              name="attributes.privacyLevel"
              control={control}
              render={({ field }) => (
                <TagGroup
                  label="Privacy Level"
                  options={PRIVACY_OPTIONS}
                  selected={field.value ? [field.value] : []}
                  onChange={(vals) => field.onChange(vals[0] || undefined)}
                  multiple={false}
                />
              )}
            />

            <Controller
              name="attributes.noiseLevel"
              control={control}
              render={({ field }) => (
                <TagGroup
                  label="Noise Level"
                  options={NOISE_OPTIONS}
                  selected={field.value ? [field.value] : []}
                  onChange={(vals) => field.onChange(vals[0] || undefined)}
                  multiple={false}
                />
              )}
            />

            <Controller
              name="attributes.userTypes"
              control={control}
              render={({ field }) => (
                <TagGroup
                  label="Ideal For"
                  options={USER_TYPE_OPTIONS}
                  selected={field.value || []}
                  onChange={field.onChange}
                  allowCustom
                  customPlaceholder="Other type..."
                />
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="attributes.hasParking"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:border-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">Parking</span>
                  </label>
                )}
              />

              <Controller
                name="attributes.hasRestroom"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:border-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">Restroom</span>
                  </label>
                )}
              />

              <Controller
                name="attributes.adaAccessible"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:border-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">ADA Accessible</span>
                  </label>
                )}
              />

              <Controller
                name="attributes.petsAllowed"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:border-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">Pets Allowed</span>
                  </label>
                )}
              />

              <Controller
                name="attributes.climateControlled"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:border-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-foreground">Climate Control</span>
                  </label>
                )}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Controller
              name="images"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  images={field.value}
                  onChange={field.onChange}
                  maxImages={5}
                />
              )}
            />

            {!canPost && (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning text-warning text-sm">
                You&apos;ve reached your limit of 3 active posts. Delete an existing post to create a new one.
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const handleCelebrationDismiss = () => {
    setShowCelebration(false);
    if (pendingPostId) {
      router.push(`/post/${pendingPostId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {showCelebration && matchResults.length > 0 && (
        <MatchCelebration
          matches={matchResults}
          onDismiss={handleCelebrationDismiss}
        />
      )}
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex-1 text-center",
                s.id === step ? "text-accent" : "text-muted"
              )}
            >
              <span className="text-xs hidden sm:block">{s.title}</span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {STEPS[step - 1].title}
          </h2>
          <p className="text-sm text-muted mb-6">{STEPS[step - 1].description}</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStep()}

            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              {step > 1 ? (
                <Button type="button" variant="ghost" onClick={prevStep}>
                  <ChevronLeft size={18} className="mr-1" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < STEPS.length ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ChevronRight size={18} className="ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit, (validationErrors) => {
                    // Navigate to the step with the first error
                    if (validationErrors.title || validationErrors.type) {
                      setStep(1);
                    } else if (validationErrors.description) {
                      setStep(2);
                    } else if (validationErrors.attributes) {
                      setStep(3);
                    }
                  })}
                  loading={loading}
                  disabled={!canPost}
                >
                  Create Post
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
