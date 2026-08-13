import { useState } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTags, useCreateTag } from "@/hooks/useTags";

interface TagSelectorProps {
  value: number[];
  onChange: (ids: number[]) => void;
}

/**
 * 标签选择器：受控组件。
 * - 已选标签显示为 chips（可删除）
 * - 输入时下拉建议匹配的已有标签（自动补全，防失控）
 * - 无精确匹配时显示"创建"项
 */
export function TagSelector({ value, onChange }: TagSelectorProps) {
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const selectedTags = allTags.filter((t) => value.includes(t.id));
  const available = allTags.filter((t) => !value.includes(t.id));
  const q = query.trim().toLowerCase();
  const matched = q
    ? available.filter((t) => t.name.toLowerCase().includes(q))
    : available;
  const exactExists = q && allTags.some((t) => t.name.toLowerCase() === q);
  const canCreate = q.length > 0 && !exactExists;

  const addTag = (id: number) => {
    onChange(Array.from(new Set([...value, id])));
    setQuery("");
  };
  const removeTag = (id: number) => onChange(value.filter((v) => v !== id));

  const handleCreate = () => {
    const name = query.trim();
    if (!name) return;
    createTag.mutate(
      { name },
      {
        onSuccess: (tag) => {
          onChange(Array.from(new Set([...value, tag.id])));
          setQuery("");
        },
      }
    );
  };

  const showDropdown = focused && (matched.length > 0 || canCreate);

  return (
    <div className="space-y-1.5">
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs"
            >
              {t.name}
              <button
                type="button"
                onClick={() => removeTag(t.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matched.length === 1) addTag(matched[0].id);
              else if (canCreate) handleCreate();
            } else if (
              e.key === "Backspace" &&
              !query &&
              selectedTags.length > 0
            ) {
              removeTag(selectedTags[selectedTags.length - 1].id);
            }
          }}
          placeholder={value.length === 0 ? "添加标签…" : ""}
          className="h-8 text-sm"
        />
        {showDropdown && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
            {matched.map((t) => (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(t.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
              >
                <TagIcon className="h-3 w-3 text-muted-foreground" />
                {t.name}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}
                className="flex w-full items-center gap-2 border-t px-3 py-1.5 text-left text-sm text-primary hover:bg-accent"
              >
                <Plus className="h-3 w-3" />
                创建“{query.trim()}”
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
