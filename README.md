# Openfoot

Openfoot é um Football Manager open source, multiplataforma, construído com Tauri (Rust) no backend e React + TypeScript no frontend.

## Como rodar o projeto

1. Instale as dependências:
	 ```sh
	 npm install
	 ```
2. Rode em modo desenvolvimento:
	 ```sh
	 npm run tauri dev
	 ```

## Estrutura do projeto

- `src/` — Frontend React (páginas, componentes, hooks, stores)
- `src-tauri/` — Backend Rust (engine, modelos, comandos Tauri)
- `src-tauri/resources/data/` — Dados de ligas, times e jogadores (JSON)

## Como adicionar novas ligas ou times

1. Edite o arquivo `src-tauri/resources/data/leagues.json` para adicionar uma nova liga:
	 - Preencha os campos obrigatórios: `Id`, `Name`, `Country`, `Tier`, `DivisionLevel`, `TeamIds`.
	 - Exemplo:
		 ```json
		 {
			 "Id": "eng-premier",
			 "Name": "Premier League",
			 "Country": "England",
			 "Tier": 1,
			 "DivisionLevel": 1,
			 "LowerDivisionId": "eng-championship",
			 "UpperDivisionId": null,
			 "TeamIds": ["man-utd", "man-city", ...]
		 }
		 ```
2. Adicione os times em `src-tauri/resources/data/teams.json`:
	 - Cada time deve ter um `Id` igual ao usado em `TeamIds` da liga.
	 - Exemplo:
		 ```json
		 {
			 "Id": "man-utd",
			 "Name": "Manchester United",
			 "Country": "England",
			 "LeagueId": "eng-premier",
			 ...
		 }
		 ```
3. Salve e rode o projeto normalmente.

## Guia: Tier vs DivisionLevel

- `Tier`: representa o nível econômico/força da liga (1 = elite mundial, 2 = elite nacional, 3 = regional, etc).
- `DivisionLevel`: representa a hierarquia da divisão dentro do país (1 = primeira divisão, 2 = segunda, etc).
- Use `DivisionLevel` para definir promoções/rebaixamentos e `Tier` para balancear força e orçamento.

## Contribuindo

Pull requests são bem-vindos! Veja as issues e contribua com novas ligas, times ou melhorias de UX.

## Aviso

**Não altere o arquivo `src-tauri/src/engine/match_engine.rs` via GPT/Copilot.** Toda lógica de simulação deve ser revisada manualmente.
