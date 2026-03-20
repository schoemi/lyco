"use client";

interface EmotionsTagsProps {
  tags: string[];
}

export function EmotionsTags({ tags }: EmotionsTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-pill-50 px-3 py-1 text-xs font-medium text-pill-700"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
