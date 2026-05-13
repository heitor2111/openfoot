const RAW_DATA = \\; // Dados devem vir aqui ou de arquivo
const positionMap = { 'Goleiro': 'GK', 'Lateral': 'LB', 'Zagueiro': 'CB', 'Volante': 'CDM', 'Meia': 'CM', 'Atacante': 'ST' };

function parseValue(val) {
    if (!val) return 0;
    val = val.replace('€', '').replace('R$', '').trim();
    if (val.endsWith('M')) return parseFloat(val) * 1000000;
    if (val.endsWith('mil')) return parseFloat(val) * 1000;
    return parseFloat(val) || 0;
}

const playerRegex = /^(\d+)\s*\n([^\n]+)\s*\n([^\n]+)\s*\n(\d+)\s+([^\n]+)\s*\n([^\n]+)/gm;
const matches = [...RAW_DATA.matchAll(playerRegex)];

matches.forEach(match => {
    console.log('Atleta:', match[2], '| Pos:', match[3], '| Idade:', match[4], '| País:', match[5].trim(), '| Valor:', match[6]);
});
