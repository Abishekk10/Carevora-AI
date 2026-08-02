export default function Loader({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm font-medium text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      {label}
    </div>
  );
}
