import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Loader2, ExternalLink, Copy, BarChart3, Pencil, Trash2,
  Check, ListChecks, Eye, Send, Files,
} from "lucide-react";
import { toast } from "sonner";
import { KEyebrow } from "@/components/k/KEyebrow";
import { KCard } from "@/components/k/KCard";
import { KButton } from "@/components/k/KButton";
import { KModal } from "@/components/k/KModal";
import { KInput } from "@/components/k/KInput";
import { KTextarea } from "@/components/k/KTextarea";
import { KBadge } from "@/components/k/KBadge";
import { useForms, useCreateForm, useDeleteForm, useUpdateForm, useCloneForm } from "@/hooks/useForms";
import { useAuth } from "@/hooks/useAuth";

function publicUrlFor(slug: string) {
  return `${window.location.origin}/f/${slug}`;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function AdminForms() {
  const { data: forms, isLoading } = useForms();
  const remove = useDeleteForm();
  const update = useUpdateForm();
  const clone = useCloneForm();
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cloningFrom, setCloningFrom] = useState<{ id: string; suggestedSlug: string; suggestedName: string } | null>(null);
  const navigate = useNavigate();

  const handleCopy = (slug: string, id: string) => {
    navigator.clipboard.writeText(publicUrlFor(slug));
    setCopiedId(id);
    toast.success("Link copiado");
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Excluir form com submissions = cascade DELETE apaga histórico de leads.
  // Se há leads vinculados, força arquivamento (active=false) em vez de delete.
  const handleDelete = async (id: string, name: string, submissionsCount: number) => {
    if (submissionsCount > 0) {
      const ok = confirm(
        `O form "${name}" tem ${submissionsCount} submission(s) vinculada(s) a leads existentes.\n\n` +
        `Excluir apagaria o histórico desses leads. Recomendamos ARQUIVAR (oculta da lista mas preserva dados).\n\n` +
        `OK = arquivar  ·  Cancelar = manter ativo`
      );
      if (!ok) return;
      try {
        await update.mutateAsync({ id, active: false });
        toast.success("Form arquivado", { description: "Submissions e leads preservados." });
      } catch (e: any) {
        toast.error("Erro ao arquivar", { description: e.message });
      }
      return;
    }
    if (!confirm(`Excluir o form "${name}"? Sem submissions, é seguro.`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Form excluído");
    } catch (e: any) {
      toast.error("Erro ao excluir", { description: e.message });
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <KEyebrow>Captação</KEyebrow>
          <h1 className="text-[28px] mt-2">
            <span className="k-serif k-grad-text">Forms</span> que viram leads
          </h1>
          <p className="mt-2 text-[13px] text-ktxt max-w-[640px]">
            Cada form tem um link público. Quando alguém preenche, vira lead
            automaticamente com UTMs e notificação pro owner.
          </p>
        </div>
        <KButton onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo form
        </KButton>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-kblue" />
        </div>
      ) : forms && forms.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {forms.map((f) => (
            <KCard key={f.id} padding="md" className="group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ListChecks className="h-4 w-4 text-kblue shrink-0" />
                    <h3 className="text-[15px] font-bold text-navy truncate">{f.name}</h3>
                    {f.active ? (
                      <KBadge tone="ok">ativo</KBadge>
                    ) : (
                      <KBadge tone="gray">pausado</KBadge>
                    )}
                  </div>
                  {f.description && (
                    <p className="mt-1 text-[12px] text-ktxt line-clamp-2">{f.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-kgray">
                    <span className="inline-flex items-center gap-1">
                      <Send className="h-3 w-3" /> {f.submissions_count ?? 0} submissions
                    </span>
                    {f.owner?.name && <span>Owner: {f.owner.name}</span>}
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    <code className="flex-1 min-w-0 text-[11px] bg-kbg px-2 py-1.5 rounded-md text-ktxt truncate">
                      /f/{f.slug}
                    </code>
                    <button
                      onClick={() => handleCopy(f.slug, f.id)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-kbdr text-kgray hover:text-kblue hover:border-kblue"
                      title="Copiar link público"
                    >
                      {copiedId === f.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <a
                      href={publicUrlFor(f.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-kbdr text-kgray hover:text-kblue hover:border-kblue"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-kbdr flex items-center gap-2">
                <KButton size="sm" variant="outline" onClick={() => navigate(`/admin/forms/${f.id}/edit`)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </KButton>
                <KButton size="sm" variant="outline" onClick={() => navigate(`/admin/forms/${f.id}/submissions`)}>
                  <Send className="h-3.5 w-3.5" /> Submissions
                </KButton>
                <KButton size="sm" variant="outline" onClick={() => navigate(`/admin/forms/${f.id}/stats`)}>
                  <BarChart3 className="h-3.5 w-3.5" /> Stats
                </KButton>
                <KButton size="sm" variant="ghost" onClick={() => window.open(publicUrlFor(f.slug), "_blank")}>
                  <Eye className="h-3.5 w-3.5" /> Preview
                </KButton>
                <button
                  onClick={() => setCloningFrom({
                    id: f.id,
                    suggestedSlug: `${f.slug}-copia`,
                    suggestedName: `${f.name} (cópia)`,
                  })}
                  className="ml-auto p-1.5 rounded-md hover:bg-kblue/10 text-kgray hover:text-kblue"
                  title="Duplicar form"
                >
                  <Files className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(f.id, f.name, f.submissions_count ?? 0)}
                  className="p-1.5 rounded-md hover:bg-danger-soft text-kgray hover:text-danger"
                  title="Excluir form"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </KCard>
          ))}
        </div>
      ) : (
        <KCard padding="lg">
          <div className="text-center py-8">
            <ListChecks className="h-10 w-10 text-kgray mx-auto" />
            <p className="mt-3 text-[14px] font-semibold text-navy">Nenhum form ainda</p>
            <p className="mt-1 text-[13px] text-ktxt">
              Crie um form pra captar leads em landing pages, links de bio e campanhas.
            </p>
            <div className="mt-4 flex justify-center">
              <KButton onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Criar primeiro form
              </KButton>
            </div>
          </div>
        </KCard>
      )}

      <CreateFormModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/admin/forms/${id}/edit`)} />
      <CloneFormModal
        source={cloningFrom}
        onClose={() => setCloningFrom(null)}
        onCloned={(id) => navigate(`/admin/forms/${id}/edit`)}
        clone={clone}
      />
    </div>
  );
}

function CloneFormModal({
  source, onClose, onCloned, clone,
}: {
  source: { id: string; suggestedSlug: string; suggestedName: string } | null;
  onClose: () => void;
  onCloned: (newId: string) => void;
  clone: ReturnType<typeof useCloneForm>;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (source) {
      setSlug(source.suggestedSlug);
      setName(source.suggestedName);
    }
  }, [source]);

  if (!source) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slugOk = slugify(slug);
    if (!slugOk) {
      toast.error("Slug inválido");
      return;
    }
    try {
      const newId = await clone.mutateAsync({
        id: source.id,
        new_slug: slugOk,
        new_name: name || undefined,
      });
      toast.success("Form duplicado", { description: "A cópia entrou como inativa pra revisão." });
      onClose();
      onCloned(newId);
    } catch (err: any) {
      const msg = err.message?.includes("slug já existe")
        ? "Esse slug já está em uso. Escolhe outro."
        : err.message;
      toast.error("Erro ao duplicar", { description: msg });
    }
  };

  return (
    <KModal open={true} onClose={onClose} title="Duplicar form" width={520}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-[12px] text-kgray">
          Cria uma cópia completa do form com todos os campos, telas de boas-vindas e
          obrigado. A cópia entra como <strong>inativa</strong> — você revisa antes de
          publicar. Útil pra A/B testing.
        </p>
        <KInput
          label="Nome interno"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Captação 2026 (variante B)"
        />
        <KInput
          label="Slug da cópia"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          hint={slug ? `${window.location.origin}/f/${slug}` : ""}
          required
          autoFocus
        />
        <div className="flex justify-end gap-2 pt-3 border-t border-kbdr">
          <KButton type="button" variant="ghost" onClick={onClose}>Cancelar</KButton>
          <KButton type="submit" loading={clone.isPending}>Duplicar e abrir editor</KButton>
        </div>
      </form>
    </KModal>
  );
}

function CreateFormModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { profile } = useAuth();
  const create = useCreateForm();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [welcomeTitle, setWelcomeTitle] = useState("Vamos conversar?");
  const [welcomeSubtitle, setWelcomeSubtitle] = useState("");
  const [thankYouTitle, setThankYouTitle] = useState("Recebemos!");
  const [thankYouMessage, setThankYouMessage] = useState("Em breve um consultor entra em contato.");
  const [slugTouched, setSlugTouched] = useState(false);
  // Estilo Respondi: form abre direto na pergunta 1, sem capa. Maximiza
  // conversão em tráfego pago (Meta/Google Ads).
  const [directMode, setDirectMode] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setSlug(""); setDescription("");
      setWelcomeTitle("Vamos conversar?"); setWelcomeSubtitle("");
      setThankYouTitle("Recebemos!"); setThankYouMessage("Em breve um consultor entra em contato.");
      setSlugTouched(false);
      setDirectMode(false);
    }
  }, [open]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) {
      toast.error("Slug inválido");
      return;
    }
    try {
      const data = await create.mutateAsync({
        name,
        slug,
        description: description || undefined,
        welcome_title: welcomeTitle,
        welcome_subtitle: welcomeSubtitle || undefined,
        welcome_layout: directMode ? "none" : "minimal",
        thank_you_title: thankYouTitle,
        thank_you_message: thankYouMessage || undefined,
        owner_id: profile?.id,
      });
      toast.success("Form criado", { description: "Agora adiciona os campos." });
      onClose();
      onCreated((data as any).id);
    } catch (err: any) {
      const msg = err.message?.includes("duplicate") || err.message?.includes("unique")
        ? "Esse slug já está em uso. Escolhe outro."
        : err.message;
      toast.error("Erro ao criar form", { description: msg });
    }
  };

  return (
    <KModal open={open} onClose={onClose} title="Novo form" width={620}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <p className="k-eyebrow">Identificação</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <KInput label="Nome interno" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Captação Lançamento 2026" required />
            <KInput
              label="Slug (URL pública)"
              value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
              placeholder="captacao-lancamento-2026"
              hint={slug ? `${window.location.origin}/f/${slug}` : "Gerado automaticamente"}
              required
            />
          </div>
          <div className="mt-3">
            <KTextarea label="Descrição interna (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>

        <div>
          <p className="k-eyebrow">Formato de abertura</p>
          <label className="mt-2 flex items-start gap-3 p-3 rounded-md border border-kbdr hover:border-kblue cursor-pointer transition">
            <input
              type="checkbox"
              checked={directMode}
              onChange={(e) => setDirectMode(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-kblue cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-navy">
                Começar direto na pergunta 1 <span className="text-kgray font-normal">(estilo Respondi)</span>
              </p>
              <p className="text-[11.5px] text-ktxt mt-0.5 leading-snug">
                Sem tela de capa. Lead clica no anúncio e já vê a primeira pergunta — recomendado pra tráfego pago (Meta Ads, Google Ads).
              </p>
            </div>
          </label>
        </div>

        {!directMode && (
          <div>
            <p className="k-eyebrow">Tela de boas-vindas</p>
            <div className="mt-2 grid grid-cols-1 gap-3">
              <KInput label="Título" value={welcomeTitle} onChange={(e) => setWelcomeTitle(e.target.value)} required={!directMode} />
              <KInput label="Subtítulo (1 frase)" value={welcomeSubtitle} onChange={(e) => setWelcomeSubtitle(e.target.value)} placeholder="Ex: 7 perguntas, 2 minutos." />
            </div>
          </div>
        )}

        <div>
          <p className="k-eyebrow">Tela de obrigado</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            <KInput label="Título" value={thankYouTitle} onChange={(e) => setThankYouTitle(e.target.value)} required />
            <KTextarea label="Mensagem" value={thankYouMessage} onChange={(e) => setThankYouMessage(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-kbdr">
          <KButton type="button" variant="ghost" onClick={onClose}>Cancelar</KButton>
          <KButton type="submit" loading={create.isPending}>Criar e adicionar campos</KButton>
        </div>
      </form>
    </KModal>
  );
}
