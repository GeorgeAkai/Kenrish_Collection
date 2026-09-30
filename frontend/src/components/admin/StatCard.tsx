export default function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border rounded-xl p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</p>
    </div>
  )
}
