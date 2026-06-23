// Isolado em arquivo próprio pra Recharts (~370KB) ser code-split.
// Não importe deste arquivo direto — use via React.lazy() no AdminFormStats.
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

interface Props {
  data: Array<{ step: number; label: string; abandoned: number }>;
}

export default function DropoffChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#EEF0F4" strokeDasharray="3 3" />
        <XAxis dataKey="step" tick={{ fontSize: 11, fill: "#7A8194" }} />
        <YAxis tick={{ fontSize: 11, fill: "#7A8194" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #EEF0F4", fontSize: 12 }}
          labelFormatter={(_, payload: any) => payload?.[0]?.payload?.label ?? ""}
          formatter={(v: number) => [v, "abandono"]}
        />
        <Bar dataKey="abandoned" fill="#0091FF" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
