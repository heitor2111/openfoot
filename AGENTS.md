# AGENTS.md

Este arquivo orienta agentes de IA sobre como contribuir e operar eficientemente no projeto Openfoot.

## Estrutura principal
- **src/**: Frontend React (componentes, páginas, hooks, stores)
- **src-tauri/**: Backend Rust (engine, modelos, comandos Tauri)
- **src-tauri/resources/data/**: Dados de ligas, times e jogadores (JSON)

## Comandos essenciais
- Instalar dependências: `npm install`
- Rodar em modo dev: `npm run tauri dev`

## Convenções
- Dados de ligas: `src-tauri/resources/data/leagues.json`
- Dados de times: `src-tauri/resources/data/teams.json`
- Dados de jogadores: `src-tauri/resources/data/players.json`
- IDs de times devem ser consistentes entre ligas e times.

## Dicas para agentes
- Sempre linkar para documentação existente, como [README.md](README.md).
- Não duplique instruções já presentes em arquivos do projeto.
- Consulte os scripts em `scripts/` para tarefas de manutenção de dados.

---

Este arquivo pode ser expandido conforme novas convenções ou áreas do projeto surgirem.