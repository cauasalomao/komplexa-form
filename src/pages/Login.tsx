import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { KCard } from "@/components/k/KCard";
import { KButton } from "@/components/k/KButton";
import { KInput } from "@/components/k/KInput";
import { KEyebrow } from "@/components/k/KEyebrow";
import { KLogo } from "@/components/k/KLogo";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/admin/forms";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error("Falha no login", { description: error });
      return;
    }
    toast.success("Bem-vindo");
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-kpage flex items-center justify-center px-6">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-6">
          <KLogo size={32} />
        </div>
        <KCard padding="lg">
          <KEyebrow>Acesso interno</KEyebrow>
          <h1 className="text-[24px] mt-2">
            Entrar na <span className="k-serif k-grad-text">plataforma</span>
          </h1>
          <p className="mt-2 text-[13px] text-ktxt">
            Apenas consultores Komplexa autorizados.
          </p>
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
            <KInput
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />
            <KInput
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />
            <KButton type="submit" loading={loading} fullWidth>
              Entrar
            </KButton>
          </form>
        </KCard>
        <p className="mt-4 text-center text-[11px] text-kgray">
          Sem conta? Peça acesso ao admin.
        </p>
      </div>
    </div>
  );
}
