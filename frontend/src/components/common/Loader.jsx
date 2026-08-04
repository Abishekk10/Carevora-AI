export default function Loader({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm font-medium text-slate-300" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-300" />
      {label}
    </div>
  );
}
