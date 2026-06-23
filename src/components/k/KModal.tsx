import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export function KModal({ open, onClose, title, children, width = 560 }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/*
        Layout em flex-column + max-h-[90vh] pro modal nunca passar da tela.
        Header e footer (se houver) ficam shrink-0; o body interno faz scroll.
        Sem isso, modais grandes (ex: Editar telas do form) cortavam o botão
        Salvar e o usuário ficava sem como confirmar.
      */}
      <div
        className="bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh]"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-kbdr shrink-0">
          <h3 className="text-[16px] font-bold text-navy">{title}</h3>
          <button
            onClick={onClose}
            className="text-kgray hover:text-navy"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}
