const fs = require('fs');

/**
 * ─────────────────────────────────────────────
 * 1. CONFIGURAÇÃO DA LIGA ATUAL
 * ─────────────────────────────────────────────
 */
const CONFIG = {
    country: "Uruguai",
    leagueId: "URU1", 
    leagueName: "Liga AUF Apertura",
    leagueTier: 2,        // Tier da LIGA (1 = Elite Mundial, 2 = Grande, 3 = Média...)
    confederation: "CONMEBOL", 
    idPrefix: "uru", 
    maxTiers: 5,
    minGapPct: 0.10
};

/**
 * ─────────────────────────────────────────────
 * 2. DADOS BRUTOS (Cole o Transfermarkt aqui)
 * ─────────────────────────────────────────────
 */
const RAW_DATA = `
1	CA Peñarol	CA Peñarol	Liga AUF Apertura	€ 41.03 mi.	€ 40.98 mi.	-0.1 %
2	Club Nacional	Club Nacional	Liga AUF Apertura	€ 18.45 mi.	€ 18.30 mi.	-0.8 %
3	Liverpool FC Montevideo	Liverpool FC Montevideo	Liga AUF Apertura	€ 13.20 mi.	€ 13.20 mi.	-
4	Defensor Sporting Club	Defensor Sporting Club	Liga AUF Apertura	€ 10.20 mi.	€ 10.20 mi.	-
5	CA Juventud	CA Juventud	Liga AUF Apertura	€ 9.50 mi.	€ 9.50 mi.	-
6	Racing Club de Montevideo	Racing Club de Montevideo	Liga AUF Apertura	€ 8.33 mi.	€ 8.33 mi.	-
7	Montevideo City Torque	Montevideo City Torque	Liga AUF Apertura	€ 8.10 mi.	€ 8.10 mi.	-
8	Montevideo Wanderers	Montevideo Wanderers	Liga AUF Apertura	€ 7.38 mi.	€ 8.08 mi.	9.5 %
9	CA Boston River	CA Boston River	Liga AUF Apertura	€ 8.03 mi.	€ 8.03 mi.	-
10	Central Español FC	Central Español FC	Liga AUF Apertura	€ 7.05 mi.	€ 7.05 mi.	-
11	Club Deportivo Maldonado	Club Deportivo Maldonado	Liga AUF Apertura	€ 7.01 mi.	€ 7.01 mi.	-
12	Albion FC	Albion FC	Liga AUF Apertura	€ 7.00 mi.	€ 7.00 mi.	-
13	Cerro Largo FC	Cerro Largo FC	Liga AUF Apertura	€ 5.78 mi.	€ 5.78 mi.	-
14	CA Progreso	CA Progreso	Liga AUF Apertura	€ 5.58 mi.	€ 5.75 mi.	3.1 %
15	FC Danubio Montevideo	FC Danubio Montevideo	Liga AUF Apertura	€ 5.73 mi.	€ 5.73 mi.	-
16	CA Cerro	CA Cerro	Liga AUF Apertura	€ 4.58 mi.	€ 4.85 mi.	6.0 %
17	Club Plaza Colonia	Club Plaza Colonia	Torneo Competencia	€ 4.83 mi.	€ 4.83 mi.	-
18	CA Rentistas	CA Rentistas	Torneo Competencia	€ 4.60 mi.	€ 4.60 mi.	-
19	CA River Plate Montevideo	CA River Plate Montevideo	Torneo Competencia	€ 3.86 mi.	€ 4.06 mi.	5.2 %
20	CA Atenas de San Carlos	CA Atenas de San Carlos	Torneo Competencia	€ 3.31 mi.	€ 3.31 mi.	-
`;

/**
 * ─────────────────────────────────────────────
 * 3. FUNÇÕES DE LIMPEZA
 * ─────────────────────────────────────────────
 */
function parseValue(str) {
    if (!str) return 0;
    const m = str.match(/€\s*([\d.,]+)\s*(mi|bi)/i);
    if (!m) return 0;
    const normalized = m[1].includes(',') ? m[1].replace(/\./g, '').replace(',', '.') : m[1];
    const v = parseFloat(normalized);
    return m[2].toLowerCase() === 'bi' ? v * 1000 : v;
}

function slugify(name) {
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, '')
        .replace(/\b(se|cr|sc|ec|fc|rb|sk|sv|tsv|wsg|scr|ud|ca|rcd|cf)\b\s*/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function parseLine(line) {
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length < 5) return null;
    const rank = parseInt(parts[0], 10);
    if (isNaN(rank)) return null;
    const name = parts[1];
    const val = parseValue(parts[4]);
    if (!name || val === 0) return null;
    return { name, val };
}

/**
 * ─────────────────────────────────────────────
 * 4. EXECUÇÃO PRINCIPAL
 * ─────────────────────────────────────────────
 */
function run() {
    const lines = RAW_DATA.trim().split('\n').filter(l => l.trim() !== '');
    const parsed = lines.map(parseLine).filter(Boolean);

    if (!parsed.length) return console.error('❌ Nenhum dado válido. Verifique o formato do RAW_DATA.');

    // Deduplicação e ordenação
    const seen = new Map();
    for (const team of parsed) {
        const existing = seen.get(team.name);
        if (!existing || team.val > existing.val) seen.set(team.name, team);
    }
    const top20 = [...seen.values()].sort((a, b) => b.val - a.val).slice(0, 20);

    // --- ALGORITMO DE GAPS (QUEBRAS NATURAIS) ---
    const gaps = [];
    for (let i = 0; i < top20.length - 1; i++) {
        const dropPct = (top20[i].val - top20[i + 1].val) / top20[i].val;
        gaps.push({ index: i, dropPct, from: top20[i].name, to: top20[i+1].name });
    }

    // Pega os N maiores gaps que ultrapassam a tolerância mínima
    const cutoffs = gaps
        .filter(g => g.dropPct >= CONFIG.minGapPct)
        .sort((a, b) => b.dropPct - a.dropPct)
        .slice(0, CONFIG.maxTiers - 1)
        .map(g => g.index)
        .sort((a, b) => a - b); // Ordena de volta pela posição na tabela

    console.log(`\n📌 Analisando quebras (Gaps) financeiras na liga:`);
    gaps.sort((a, b) => b.dropPct - a.dropPct).slice(0, 4).forEach(g => {
        const isCutoff = cutoffs.includes(g.index) ? '✂️ CORTE' : '〰️';
        console.log(`   ${isCutoff} ${g.from} → ${g.to}: Queda de ${(g.dropPct * 100).toFixed(1)}%`);
    });
    console.log("");

    // --- Montar objetos finais com Tier Dinâmico ---
    let currentTier = 1;
    const finalTeams = top20.map((t, index) => {
        const tier = currentTier;
        const id = `${CONFIG.idPrefix}-${slugify(t.name)}`;
        
        console.log(`[Tier ${tier}] #${String(index + 1).padStart(2)} ${t.name.padEnd(25)} € ${t.val.toFixed(2).padStart(7)}M → ${id}`);

        // Se este índice foi marcado como um "corte", o próximo time cai um Tier
        if (cutoffs.includes(index)) currentTier++;

        return {
            Id: id,
            Name: t.name,
            Country: CONFIG.country,
            State: "",
            LeagueId: CONFIG.leagueId,
            Tier: tier,
            Badge: `badges/${id}.png`,
            Coach: {
                Id: `${id}-coach`,
                Name: "Treinador Padrão",
                Overall: 90 - (tier - 1) * 10, // Tier 1 = 90, Tier 2 = 80, etc.
                Experience: 5,
                Tactics: "4-3-3"
            },
            Stadium: "Estádio Municipal"
        };
    });

    // --- Salvar teams.json ---
    const teamsPath = '../src-tauri/resources/data/teams.json';
    let teamsDb = { Teams: [] };
    if (fs.existsSync(teamsPath)) teamsDb = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));

    finalTeams.forEach(nt => {
        const i = teamsDb.Teams.findIndex(t => t.Id === nt.Id);
        if (i !== -1) teamsDb.Teams[i] = nt; else teamsDb.Teams.push(nt);
    });
    fs.writeFileSync(teamsPath, JSON.stringify(teamsDb, null, 2));

    // --- Salvar leagues.json ---
    const leaguesPath = '../src-tauri/resources/data/leagues.json';
    if (fs.existsSync(leaguesPath)) {
        let leaguesDb = { Leagues: [] };
        try {
            const content = fs.readFileSync(leaguesPath, 'utf8').trim();
            if (content) leaguesDb = JSON.parse(content);
        } catch (e) {
            console.log("⚠️ Erro ao ler leagues.json, iniciando novo.");
        }

        // Procura a liga pelo ID
        let leagueIndex = leaguesDb.Leagues.findIndex(
            l => String(l.Id).toUpperCase() === CONFIG.leagueId.toUpperCase()
        );

        const uniqueIds = [...new Set(finalTeams.map(t => t.Id))];

        // Montamos o objeto da liga com os novos campos
        const leagueData = {
            Id: CONFIG.leagueId,
            Name: CONFIG.leagueName,       // Vem do CONFIG
            Country: CONFIG.country,
            Confederation: CONFIG.confederation, // Vem do CONFIG
            LeagueTier: CONFIG.leagueTier,       // Vem do CONFIG
            TotalClubs: uniqueIds.length,
            TeamIds: uniqueIds
        };

        if (leagueIndex !== -1) {
            // Se já existe, atualiza (mantém a posição no array)
            leaguesDb.Leagues[leagueIndex] = leagueData;
            console.log(`✅ Liga ${CONFIG.leagueName} atualizada.`);
        } else {
            // Se não existe (arquivo resetado), adiciona nova
            leaguesDb.Leagues.push(leagueData);
            console.log(`✅ Nova liga ${CONFIG.leagueName} registrada.`);
        }

        fs.writeFileSync(leaguesPath, JSON.stringify(leaguesDb, null, 2));
        console.log(`\n✅ Processo concluído com sucesso!`);
    }
}

run();