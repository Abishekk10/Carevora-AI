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
  if (!items?.length) return <p className="text-sm text-slate-400">{emptyText}</p>;

  return items.map((item, index) => (
    <div key={`${typeof item === "string" ? item : JSON.stringify(item)}-${index}`} className="text-sm text-slate-200">
      {typeof item === "string" ? (
        <p>{item}</p>
      ) : (
        Object.entries(item)
          .filter(([, value]) => value)
          .map(([key, value]) => (
            <p key={key} className="leading-6">
              <span className="capitalize text-slate-400">{key.replaceAll("_", " ")}:</span>{" "}
              {Array.isArray(value) ? value.join(", ") : String(value)}
            </p>
          ))
      )}
    </div>
  ));
}

function Section({ icon: Icon, title, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-slate-900/60 p-5 ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
        <Icon className="h-5 w-5 text-indigo-300" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function ResumeIntelligenceCard({ intelligence }) {
  if (!intelligence || intelligence.status !== "complete") return null;
  const { contact = {}, skills = [], education = [], experience = [], projects = [], certifications = [] } = intelligence;
  return (
    <article className="surface overflow-hidden">
      <header className="border-b border-white/10 bg-gradient-to-r from-indigo-500/15 to-violet-500/15 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-white">Resume summary</h2>
            <p className="text-sm text-slate-300">AI-extracted profile from your uploaded resume.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
        <Section icon={Mail} title="Contact Information">
          <p className="font-medium text-white">{contact.full_name || "Name not found"}</p>
          {contact.email && (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-200">
              <Mail className="h-4 w-4 text-slate-400" />
              {contact.email}
            </p>
          )}
          {contact.phone && (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-200">
              <Phone className="h-4 w-4 text-slate-400" />
              {contact.phone}
            </p>
          )}
        </Section>

        <Section icon={Code2} title="Skills">
          {skills.length ? (
            skills.map((skill) => (
              <span key={skill} className="mr-2 inline-flex rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200">
                {skill}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-400">No skills extracted.</p>
          )}
        </Section>

        <Section icon={GraduationCap} title="Education">
          <DetailList items={education} />
        </Section>

        <Section icon={BriefcaseBusiness} title="Experience">
          <DetailList items={experience} />
        </Section>

        <Section icon={Code2} title="Projects">
          <DetailList items={projects} />
        </Section>

        <Section icon={Award} title="Certifications">
          <DetailList items={certifications} />
        </Section>
      </div>
    </article>
  );
}
