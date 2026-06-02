import type { IconName } from "../shared";

function NavIcon({ name }: { name: IconName }) {
  const cls = "h-[18px] w-[18px] stroke-current fill-none";
  switch (name) {
    case "home":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/></svg>;
    case "kanban":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>;
    case "calendar":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case "tasks":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><path d="M9 11.5 11 13.5l4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>;
    case "notes":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><path d="M6 3.5h9l3 3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5z"/><path d="M14.5 3.5V7h3.5M8 11h7M8 15h8M8 18h5"/></svg>;
    case "chat":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"/></svg>;
    case "user":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>;
    case "settings":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.5-2-3.5-2.4.5a8.3 8.3 0 0 0-.8-.7l-.3-2.4h-4l-.3 2.4a8.3 8.3 0 0 0-.8.7l-2.4-.5-2 3.5 2 1.5a7.8 7.8 0 0 0 .1 1l-2 1.5 2 3.5 2.4-.5c.2.3.5.5.8.7l.3 2.4h4l.3-2.4c.3-.2.6-.4.8-.7l2.4.5 2-3.5z"/></svg>;
  }
}

type SidebarProps = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (updater: (prev: boolean) => boolean) => void;
  phone: string;
  modules: Array<{ id: string; label: string; icon: IconName }>;
  accountItems: Array<{ id: string; label: string; icon: IconName }>;
  allowedModules: string[];
  selectedModule: string;
  setSelectedModule: (value: string) => void;
  logout: () => void | Promise<void>;
};

export function Sidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  phone,
  modules,
  accountItems,
  allowedModules,
  selectedModule,
  setSelectedModule,
  logout,
}: SidebarProps) {
  return (
    <aside className={`${sidebarCollapsed ? "w-[84px]" : "w-[270px]"} border-r border-[var(--line)] bg-white/90 px-3 py-6 backdrop-blur-sm transition-all duration-300 ease-out`}>
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
        {sidebarCollapsed ? "CRM" : "CRM GVG"}
      </p>
      <p className={`mt-2 overflow-hidden text-sm text-[var(--muted)] transition-all duration-300 ${sidebarCollapsed ? "max-h-0 opacity-0" : "max-h-10 opacity-100"}`}>
        {phone}
      </p>
      <button
        onClick={() => setSidebarCollapsed((prev) => !prev)}
        className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-[var(--line)] text-xs"
      >
        {sidebarCollapsed ? "»" : "«"}
      </button>

      <nav className="mt-8 space-y-2">
        {modules.filter((item) => allowedModules.includes(item.id)).map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedModule(item.id)}
            title={item.label}
            className={`flex h-11 w-full items-center ${sidebarCollapsed ? "justify-center" : ""} rounded-xl px-3 text-left text-sm font-medium transition-all duration-300 ${
              selectedModule === item.id
                ? "bg-pink-100 text-[var(--primary)]"
                : "text-[var(--foreground)] hover:bg-pink-50"
            }`}
          >
            <span className="text-[var(--muted)]"><NavIcon name={item.icon} /></span>
            <span className={`ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "max-w-0 translate-x-1 opacity-0" : "max-w-[140px] translate-x-0 opacity-100"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-8 border-t border-[var(--line)] pt-6">
        {accountItems.filter((item) => allowedModules.includes(item.id)).map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedModule(item.id)}
            title={item.label}
            className={`mb-2 flex h-11 w-full items-center ${sidebarCollapsed ? "justify-center" : ""} rounded-xl px-3 text-left text-sm font-medium transition-all duration-300 ${
              selectedModule === item.id
                ? "bg-pink-100 text-[var(--primary)]"
                : "text-[var(--foreground)] hover:bg-pink-50"
            }`}
          >
            <span className="text-[var(--muted)]"><NavIcon name={item.icon} /></span>
            <span className={`ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "max-w-0 translate-x-1 opacity-0" : "max-w-[140px] translate-x-0 opacity-100"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={logout}
        className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--line)] text-sm font-semibold text-[var(--foreground)]"
      >
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-[100px] opacity-100"}`}>
          Sair
        </span>
        <span className={`text-[var(--muted)] transition-all duration-300 ${sidebarCollapsed ? "opacity-100" : "opacity-0 absolute"}`}>⎋</span>
      </button>
    </aside>
  );
}
