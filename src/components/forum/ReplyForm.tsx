"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { replySchema, ReplyFormData } from "@/lib/utils/forum-validators";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Send } from "lucide-react";

interface ReplyFormProps {
  onSubmit: (data: ReplyFormData) => Promise<void>;
  disabled?: boolean;
}

export function ReplyForm({ onSubmit, disabled }: ReplyFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
  });

  const handleFormSubmit = async (data: ReplyFormData) => {
    await onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
      <Textarea
        {...register("body")}
        placeholder="Write a reply..."
        error={errors.body?.message}
        disabled={disabled || isSubmitting}
        className="min-h-[80px]"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          loading={isSubmitting}
          disabled={disabled || isSubmitting}
        >
          <Send size={14} className="mr-1.5" />
          Reply
        </Button>
      </div>
    </form>
  );
}
