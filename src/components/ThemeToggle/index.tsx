import useThemeStore, { THEMES } from '@/stores/ThemeStore'

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="dropdown dropdown-end dropdown-bottom fixed top-4 right-4 z-50">
      <button
        tabIndex={0}
        className="btn btn-circle btn-sm shadow-lg"
        title="Alterar tema"
        style={{ backgroundColor: THEMES.find((t) => t.id === theme)?.preview }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
          <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" />
        </svg>
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-200 border border-base-300 rounded-box z-50 mb-2 w-40 p-1 shadow-xl"
      >
        {THEMES.map((t) => (
          <li key={t.id}>
            <button
              className={`flex items-center gap-2 w-full text-sm${theme === t.id ? ' active font-semibold' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <span
                className="inline-block size-3 rounded-full border border-base-content/20 shrink-0"
                style={{ backgroundColor: t.preview }}
              />
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
