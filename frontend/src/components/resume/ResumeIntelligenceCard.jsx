import {
  Award,
  BriefcaseBusiness,
  Code2,
  GraduationCap,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";

function DetailList({ items, emptyText = "No information extracted." }) {
  if (!items?.length) return <p className="text-sm text-slate-500">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${typeof item === "string" ? item : JSON.stringify(item)}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {typeof item === "string" ? item : Object.entries(item).filter(([, value]) => value).map(([key, value]) => (
            <p key={key}><span className="capitalize text-slate-500">{key.replaceAll("_", " ")}: </span>{Array.isArray(value) ? value.join(", ") : String(value)}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, children, className = "" }) {
  return <section className={`rounded-2xl border border-slate-100 p-5 ${className}`}>
    <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><Icon className="h-5 w-5 text-indigo-600" />{title}</h3>
    {children}
  </section>;
}

export default function ResumeIntelligenceCard({ intelligence }) {
  if (!intelligence || intelligence.status !== "complete") return null;
  const { contact = {}, skills = [], education = [], experience = [], projects = [], certifications = [] } = intelligence;
  return (
    <article className="surface overflow-hidden">
      <header className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Resume summary</h2><p className="text-sm text-slate-600">AI-extracted profile from your uploaded resume.</p></div></div>
      </header>
      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
        <Section icon={Mail} title="Contact Information">
          <div className="space-y-2 text-sm text-slate-700"><p className="font-medium text-slate-900">{contact.full_name || "Name not found"}</p>{contact.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{contact.email}</p>}{contact.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{contact.phone}</p>}</div>
        </Section>
        <Section icon={Code2} title="Skills"><div className="flex flex-wrap gap-2">{skills.length ? skills.map((skill) => <span key={skill} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{skill}</span>) : <p className="text-sm text-slate-500">No skills extracted.</p>}</div></Section>
        <Section icon={GraduationCap} title="Education"><DetailList items={education} /></Section>
        <Section icon={BriefcaseBusiness} title="Experience"><DetailList items={experience} /></Section>
        <Section icon={Code2} title="Projects"><DetailList items={projects} /></Section>
        <Section icon={Award} title="Certifications"><DetailList items={certifications} /></Section>
      </div>
    </article>
  );
}
