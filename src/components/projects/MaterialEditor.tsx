import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useMaterialsByProject,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from "@/hooks/useProjects";
import type { Project, Material, MaterialType } from "@/types/entities";

const materialTypeLabels: Record<MaterialType, string> = {
  book: "书",
  article: "文章",
  video: "视频",
  doc: "文档",
};

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function MaterialRow({
  material,
  onUpdate,
  onDelete,
}: {
  material: Material;
  onUpdate: (id: number, input: { progress?: number }) => void;
  onDelete: (id: number) => void;
}) {
  const [progress, setProgress] = useState(material.progress.toString());

  useEffect(() => {
    setProgress(material.progress.toString());
  }, [material.progress]);

  const commitProgress = () => {
    const n = Math.max(0, Math.min(100, Number(progress) || 0));
    setProgress(n.toString());
    if (n !== material.progress) onUpdate(material.id, { progress: n });
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="outline" className="shrink-0">
        {materialTypeLabels[material.type]}
      </Badge>
      <span className="flex-1 truncate" title={material.title}>
        {material.title}
      </span>
      {material.author && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {material.author}
        </span>
      )}
      <Input
        type="number"
        min={0}
        max={100}
        value={progress}
        onChange={(e) => setProgress(e.target.value)}
        onBlur={commitProgress}
        className="h-7 w-14 text-xs"
        aria-label="进度"
      />
      <span className="text-xs text-muted-foreground">%</span>
      {material.pages ? (
        <span className="text-xs text-muted-foreground">/{material.pages}页</span>
      ) : null}
      <button
        onClick={() => onDelete(material.id)}
        className="text-muted-foreground hover:text-destructive"
        aria-label="删除素材"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MaterialEditor({ project }: { project: Project }) {
  const { data: materials = [] } = useMaterialsByProject(project.id);
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial(project.id);
  const deleteMaterial = useDeleteMaterial(project.id);

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<MaterialType>("book");

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createMaterial.mutate({
      project_id: project.id,
      type: newType,
      title: newTitle.trim(),
    });
    setNewTitle("");
  };

  return (
    <div className="space-y-1.5 pl-2">
      <div className="flex gap-1.5">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="添加学习素材…"
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <select
          className={selectClass}
          value={newType}
          onChange={(e) => setNewType(e.target.value as MaterialType)}
        >
          <option value="book">书</option>
          <option value="article">文章</option>
          <option value="video">视频</option>
          <option value="doc">文档</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2"
          onClick={handleAdd}
          aria-label="添加素材"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {materials.length === 0 ? (
        <p className="pl-1 text-xs text-muted-foreground">暂无素材</p>
      ) : (
        materials.map((m) => (
          <MaterialRow
            key={m.id}
            material={m}
            onUpdate={(id, input) => updateMaterial.mutate({ id, input })}
            onDelete={(id) => deleteMaterial.mutate(id)}
          />
        ))
      )}
    </div>
  );
}
