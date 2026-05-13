/**
 * Formata valor numérico para string com separador de milhar ponto e decimal vírgula.
 */
function formatarValor(valor) {
    return valor.toFixed(2)
        .replace('.', ',')
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
const fs = require('fs');

/**
 * ─────────────────────────────────────────────
 * 1. CONFIGURAÇÃO
 * ─────────────────────────────────────────────
 * Altere apenas este bloco ao trocar de time.
 */
const CONFIG = {
    teamId: "" // Id do time no teams.json (ex: "bra-flamengo"),
};

/**
 * ─────────────────────────────────────────────
 * 2. DADOS BRUTOS
 * ─────────────────────────────────────────────
 * Cole aqui o elenco copiado do Transfermarkt.
 * Formato esperado por jogador:
 *
 *   [número]\t[clube anterior? opcional]
 *   [nome]\t[nome repetido]
 *   [posição]
 *   [dd/mm/aaaa] ([idade])\t[nacionalidade]\t€ X mi.
 *   [segunda nacionalidade? opcional]
 */
const RAW_DATA = `
"uru-penarol",
29	Independiente Medellín
Washington Aguerre	Washington Aguerre
Goleiro
23/04/1993 (33)	Uruguai	€ 550 mil
1	Universitario de Deportes
Sebastián Britos	Sebastián Britos
Goleiro
02/01/1988 (38)	Uruguai	€ 50 mil
34	
Nahuel Herrera	Nahuel Herrera 
Zagueiro
01/12/2004 (21)	Uruguai	€ 4.50 mi.
4	Puebla FC
Emanuel Gularte	Emanuel Gularte
Zagueiro
30/09/1997 (28)	Uruguai	€ 2.50 mi.
3	CR Vasco da Gama
Mauricio Lemos	Mauricio Lemos
Zagueiro
28/12/1995 (30)	Uruguai	€ 1.50 mi.
6	Defensa y Justicia
Lucas Ferreira	Lucas Ferreira
Zagueiro
16/06/2000 (25)	Uruguai	€ 1.50 mi.
25	FC Danubio Montevideo
Matías González	Matías González
Zagueiro
29/11/2002 (23)	Uruguai	€ 600 mil
26	Manta FC
Andrés Madruga	Andrés Madruga
Zagueiro
06/02/2004 (22)	Uruguai	€ 300 mil
93	Sem clube
Diego Laxalt	Diego Laxalt
Lateral Esq.
07/02/1993 (33)	Uruguai
Itália	€ 1.20 mi.
15	
Maximiliano Olivera	Maximiliano Olivera  
Lateral Esq.
05/03/1992 (34)	Uruguai
Espanha	€ 250 mil
27	
Lucas Hernández	Lucas Hernández
Lateral Esq.
05/08/1992 (33)	Uruguai	€ 200 mil
2	Houston Dynamo FC
Franco Escobar	Franco Escobar
Lateral Dir.
21/02/1995 (31)	Argentina
Estados Unidos	€ 800 mil
14	CA Peñarol B
Kevin Rodríguez	Kevin Rodríguez
Lateral Dir.
29/10/2005 (20)	Uruguai	€ 150 mil
5	
Eric Remedi	Eric Remedi
Volante
04/06/1995 (30)	Argentina	€ 1.00 mi.
21	Barcelona SC Guayaquil
Jesús Trindade	Jesús Trindade
Volante
10/07/1993 (32)	Uruguai	€ 650 mil
8	CD Godoy Cruz Antonio Tomba
Nicolás Fernández	Nicolás Fernández
Meia Central
02/03/1998 (28)	Uruguai	€ 2.20 mi.
13	
Eduardo Darias	Eduardo Darias 
Meia Central
28/02/1998 (28)	Uruguai	€ 1.20 mi.
30	CA Peñarol B
Stiven Muhlethaler	Stiven Muhlethaler
Meia Direita
31/01/2006 (20)	Uruguai	€ 375 mil
10	
Leonardo Fernández	Leonardo Fernández 
Meia Ofensivo
08/11/1998 (27)	Uruguai	€ 7.50 mi.
32	
Leandro Umpiérrez	Leandro Umpiérrez
Meia Ofensivo
20/03/2004 (22)	Uruguai	€ 650 mil
80	Internacional de Bogotá
Franco González	Franco González
Meia Ofensivo
22/06/2004 (21)	Uruguai	€ 250 mil
23	Defensa y Justicia
Gastón Togni	Gastón Togni
Ponta Esquerda
20/09/1997 (28)	Argentina	€ 3.20 mi.
77	CA Talleres
Luis Angulo	Luis Angulo 
Ponta Esquerda
23/03/2004 (22)	Colômbia	€ 2.50 mi.
40	CA Peñarol U19
Brandon Álvarez	Brandon Álvarez
Ponta Esquerda
14/10/2007 (18)	Uruguai	-
7	
Javier Cabrera	Javier Cabrera
Ponta Direita
18/03/1992 (34)	Uruguai	€ 300 mil
19	Grêmio FBPA
Matías Arezo	Matías Arezo
Centroavante
21/11/2002 (23)	Uruguai	€ 6.00 mi.
9	Atlético Nacional
Facundo Batista	Facundo Batista
Centroavante
16/01/1999 (27)	Uruguai	€ 900 mil
11	Liverpool FC Montevideo
Abel Hernández	Abel Hernández
Centroavante
08/08/1990 (35)	Uruguai	€ 150 mil
        "uru-clubnacional",
25	
Ignacio Suárez	Ignacio Suárez
Goleiro
05/02/2002 (24)	Uruguai
Itália	€ 300 mil
1	
Luis Mejía	Luis Mejía
Goleiro
16/03/1991 (35)	Panamá
Uruguai	€ 250 mil
2	Hertha Berlim
Agustín Rogel	Agustín Rogel
Zagueiro
17/10/1997 (28)	Uruguai
Itália	€ 500 mil
15	
Paolo Calione	Paolo Calione
Zagueiro
22/05/2006 (19)	Uruguai
Itália	€ 500 mil
4	
Sebastián Coates	Sebastián Coates 
Zagueiro
07/10/1990 (35)	Uruguai
Espanha	€ 300 mil
32	Club Nacional B
Tomás Viera	Tomás Viera
Zagueiro
18/03/2006 (20)	Uruguai	€ 200 mil
21	CD Cruz Azul
Camilo Cándido	Camilo Cándido
Lateral Esq.
02/06/1995 (30)	Uruguai
Itália	€ 700 mil
34	Club Nacional U19
Federico Bais	Federico Bais
Lateral Esq.
29/01/2008 (18)	Uruguai	€ 300 mil
5	Club de Gimnasia y Esgrima La Plata
Juan Pintado	Juan Pintado
Lateral Dir.
28/07/1997 (28)	Uruguai	€ 1.50 mi.
13	
Emiliano Ancheta	Emiliano Ancheta
Lateral Dir.
09/06/1999 (26)	Uruguai	€ 1.00 mi.
77	
Nicolás Rodríguez	Nicolás Rodríguez
Lateral Dir.
22/07/1991 (34)	Uruguai	€ 200 mil
8	Deportes Concepción
Mauricio Vera	Mauricio Vera
Volante
08/05/1998 (27)	Argentina	€ 600 mil
6	
Luciano Boggio	Luciano Boggio
Meia Central
10/03/1999 (27)	Uruguai
Itália	€ 2.00 mi.
30	CA Independiente
Baltasar Barcia	Baltasar Barcia
Meia Central
19/02/2001 (25)	Uruguai	€ 700 mil
10	Club Nacional U19
Agustín Dos Santos	Agustín Dos Santos
Meia Central
09/02/2008 (18)	Uruguai	€ 450 mil
23	Racing Club de Montevideo
Lucas Rodríguez	Lucas Rodríguez
Meia Central
08/05/1993 (32)	Uruguai	€ 300 mil
14	Houston Dynamo FC
Nicolás Lodeiro	Nicolás Lodeiro
Meia Ofensivo
21/03/1989 (37)	Uruguai
Estados Unidos	€ 100 mil
19	CA River Plate Montevideo
Juan Cruz de los Santos	Juan Cruz de los Santos
Ponta Esquerda
22/02/2003 (23)	Uruguai	€ 1.20 mi.
26	
Bruno Arady	Bruno Arady
Ponta Esquerda
01/07/2007 (18)	Uruguai
Itália	€ 400 mil
31	Club Nacional U19
Rodrigo Martínez	Rodrigo Martínez
Ponta Esquerda
22/03/2008 (18)	Uruguai	€ 300 mil
24	
Exequiel Mereles	Exequiel Mereles
Ponta Esquerda
16/09/2005 (20)	Uruguai	€ 200 mil
27	Grasshopper Club Zurique
Tomás Verón Lupi	Tomás Verón Lupi
Ponta Direita
03/09/2000 (25)	Argentina
Itália	€ 400 mil
9	Defensor Sporting Club
Maxi Gómez	Maxi Gómez
Centroavante
14/08/1996 (29)	Uruguai	€ 2.00 mi.
11	CA Peñarol
Maximiliano Silvera	Maximiliano Silvera
Centroavante
05/09/1997 (28)	Uruguai	€ 2.00 mi.
7	Club León
Nicolás López	Nicolás López
Centroavante
01/10/1993 (32)	Uruguai	€ 1.40 mi.
20	
Gonzalo Carneiro	Gonzalo Carneiro
Centroavante
12/09/1995 (30)	Uruguai	€ 500 mil
        "uru-liverpoolmontevideo",
1	Magallanes
Mathías Bernatene	Mathías Bernatene
Goleiro
24/07/2000 (25)	Uruguai	€ 300 mil
25	CA Peñarol
Martín Campaña	Martín Campaña
Goleiro
29/05/1989 (36)	Uruguai
Itália	€ 100 mil
23	
Enzo Castillo	Enzo Castillo
Zagueiro
23/12/2000 (25)	Uruguai	€ 600 mil
3	CA Colegiales
Santiago Strasorier	Santiago Strasorier
Zagueiro
07/06/2000 (25)	Argentina	€ 350 mil
15	CA Aldosivi
Santiago Laquidaín	Santiago Laquidaín
Zagueiro
28/07/2001 (24)	Argentina
Itália	€ 350 mil
27	Club Deportivo Maldonado
Diego Romero	Diego Romero
Lateral Esq.
02/03/2000 (26)	Uruguai	€ 750 mil
34	OFI Creta
Kevin Lewis	Kevin Lewis
Lateral Esq.
08/01/1999 (27)	Uruguai	€ 450 mil
18	
Agustín Cayetano	Agustín Cayetano
Lateral Esq.
09/08/1999 (26)	Uruguai	€ 300 mil
24	
Kevin Amaro	Kevin Amaro
Lateral Dir.
03/03/2004 (22)	Uruguai	€ 3.50 mi.
4	
Facundo Perdomo	Facundo Perdomo
Lateral Dir.
21/08/1999 (26)	Uruguai	€ 1.00 mi.
14	
Jean Rosso	Jean Rosso 
Lateral Dir.
07/04/1997 (29)	Uruguai	€ 300 mil
6	
Santiago Milano	Santiago Milano
Volante
12/02/2003 (23)	Uruguai	€ 150 mil
5	CA Vélez Sarsfield
Nicolás Garayalde	Nicolás Garayalde
Meia Central
21/07/1999 (26)	Argentina	€ 550 mil
20	
Martín Rabuñal	Martín Rabuñal 
Meia Central
22/04/1994 (32)	Uruguai	€ 300 mil
29	Cerro Largo FC
Ezequiel Olivera	Ezequiel Olivera
Meia Central
20/12/2003 (22)	Uruguai	€ 300 mil
8	Cerro Largo FC
Matías Mir	Matías Mir
Meia Direita
26/05/2003 (22)	Uruguai
Espanha	€ 500 mil
16	
Lucas Acosta	Lucas Acosta
Meia Ofensivo
26/01/2002 (24)	Uruguai	€ 500 mil
17	Liverpool FC Montevideo B
Gonzalo de Mello	Gonzalo de Mello
Meia Ofensivo
07/04/2005 (21)	Uruguai	-
7	Atlético Goianiense
Federico Martínez	Federico Martínez
Ponta Esquerda
28/02/1996 (30)	Uruguai
Espanha	€ 700 mil
10	Racing Club
Ramiro Degregorio	Ramiro Degregorio
Ponta Direita
06/02/2003 (23)	Argentina	€ 300 mil
22	Sem clube
Diego Zabala	Diego Zabala
Ponta Direita
19/09/1991 (34)	Uruguai	€ 200 mil
13	
Alfonso de Luca	Alfonso de Luca
Ponta Direita
03/10/2005 (20)	Uruguai	€ 50 mil
9	
Renzo Machado	Renzo Machado
Centroavante
21/09/2005 (20)	Uruguai
Itália	€ 1.20 mi.
31	CRB
Facundo Barceló	Facundo Barceló
Centroavante
31/03/1993 (33)	Uruguai
Itália	€ 250 mil
11	AA Argentinos Juniors
Rubén Bentancourt	Rubén Bentancourt
Centroavante
02/03/1993 (33)	Uruguai
Itália	€ 200 mil
32	CA Peñarol U19
Felipe Barrenechea	Felipe Barrenechea
Centroavante
23/06/2007 (18)	Lituânia
Uruguai	-
        "uru-defensorsportingclub",
12	
Kevin Dawson	Kevin Dawson
Goleiro
08/02/1992 (34)	Uruguai	€ 300 mil
1	
Lucas Machado	Lucas Machado
Goleiro
10/04/1998 (28)	Uruguai	€ 250 mil
23	
Bruno Simone	Bruno Simone
Goleiro
27/06/2004 (21)	Uruguai	-
20	Defensor Sporting Club B
Mateo Caballero	Mateo Caballero
Zagueiro
26/08/2007 (18)	Uruguai	€ 300 mil
61	Universitario de Deportes
Marco Saravia	Marco Saravia
Zagueiro
06/02/1999 (27)	Perú	€ 300 mil
3	
Guillermo de los Santos	Guillermo de los Santos 
Zagueiro
15/02/1991 (35)	Uruguai	€ 150 mil
2	
Daniel Martínez	Daniel Martínez
Zagueiro
03/01/2007 (19)	Uruguai	-
4	
Geanfranco Rodríguez	Geanfranco Rodríguez
Zagueiro
03/08/2006 (19)	Uruguai	-
14	Defensor Sporting U19
Francisco Sorondo	Francisco Sorondo
Zagueiro
14/08/2008 (17)	Uruguai
Brasil	-
15	Club Nacional
Axel Frugone	Axel Frugone
Lateral Esq.
01/04/2005 (21)	Uruguai
Itália	€ 650 mil
17	Sem clube
Valentín Rodríguez	Valentín Rodríguez
Lateral Esq.
13/06/2001 (24)	Uruguai	€ 300 mil
24	Puebla FC
Lucas de los Santos	Lucas de los Santos
Volante
26/07/2001 (24)	Uruguai	€ 600 mil
6	
Mauricio Amaro	Mauricio Amaro
Meia Central
19/07/2005 (20)	Uruguai	€ 1.00 mi.
5	
Germán Barrios	Germán Barrios
Meia Central
26/01/2004 (22)	Uruguai	€ 800 mil
8	
Nicolás Wunsch	Nicolás Wunsch
Meia Central
14/06/2003 (22)	Uruguai	€ 300 mil
27	Central Español FC
Juan Manuel Jorge	Juan Manuel Jorge
Meia Central
22/04/2004 (22)	Uruguai
Espanha	€ 175 mil
30	Cerro Largo FC
Erico Cuello	Erico Cuello
Meia Central
25/05/2005 (20)	Uruguai	€ 100 mil
10	
Xavier Biscayzacú	Xavier Biscayzacú
Meia Ofensivo
28/03/2005 (21)	México
Uruguai	€ 1.00 mi.
7	Sem clube
Brian Lozano	Brian Lozano
Ponta Esquerda
23/02/1994 (32)	Uruguai	€ 500 mil
11	
Lucas Agazzi	Lucas Agazzi
Ponta Direita
02/05/2005 (21)	Uruguai
Itália	€ 1.50 mi.
22	Defensor Sporting U19
Alan Torterolo	Alan Torterolo
Ponta Direita
03/01/2008 (18)	Uruguai
Itália	€ 300 mil
77	CD Palestino
Facundo Castro	Facundo Castro
Ponta Direita
22/01/1995 (31)	Uruguai
Itália	€ 250 mil
31	CA Atlanta
Nicolás Medina	Nicolás Medina
Ponta Direita
05/03/2003 (23)	Argentina	€ 175 mil
33	Defensor Sporting U19
Santino Bruschi	Santino Bruschi
Ponta Direita
21/02/2006 (20)	Uruguai	-
9	CA Peñarol
Alexander Machado	Alexander Machado
Centroavante
28/05/2002 (23)	Uruguai	€ 400 mil
26	SD Aucas
Brian Montenegro	Brian Montenegro
Centroavante
10/06/1993 (32)	Paraguai
Itália	€ 400 mil
28	Defensor Sporting U19
Lautaro Navarro	Lautaro Navarro
Centroavante
10/02/2008 (18)	Uruguai	€ 300 mil
97	Club Atlético Platense II
Juan Pablo Goicochea	Juan Pablo Goicochea
Centroavante
12/01/2005 (21)	Perú	€ 150 mil
        "uru-juventud",
12	Sem clube
Nicolás Rossi	Nicolás Rossi
Goleiro
16/05/1998 (27)	Uruguai	€ 300 mil
33	Uruguay Montevideo FC
Nicolás Ruotola	Nicolás Ruotola
Goleiro
28/10/2004 (21)	Uruguai	€ 50 mil
1	
Sebastián Sosa	Sebastián Sosa 
Goleiro
19/08/1986 (39)	Uruguai
México	€ 25 mil
5	
David Morosini	David Morosini
Zagueiro
18/02/2004 (22)	Uruguai	€ 800 mil
2	CA Vélez Sarsfield
Patricio Pernicone	Patricio Pernicone
Zagueiro
04/07/2001 (24)	Argentina	€ 400 mil
28	CA Juventud B
Franco Risso	Franco Risso
Zagueiro
15/05/2003 (22)	Uruguai	€ 200 mil
3	
Axel Prado	Axel Prado
Zagueiro
17/11/2002 (23)	Uruguai	€ 150 mil
4	Sem clube
Martín Cáceres	Martín Cáceres 
Zagueiro
07/04/1987 (39)	Uruguai	€ 75 mil
16	FC Danubio Montevideo
Renzo Rabino	Renzo Rabino
Lateral Esq.
19/12/1997 (28)	Uruguai	€ 300 mil
23	
Emmanuel Más	Emmanuel Más
Lateral Esq.
15/01/1989 (37)	Argentina
Itália	€ 100 mil
6	Rampla Juniors Futbol Club
Agustín Pérez	Agustín Pérez
Lateral Esq.
23/04/2004 (22)	Uruguai	€ 50 mil
24	
Federico Barrandeguy	Federico Barrandeguy
Lateral Dir.
08/05/1996 (29)	Uruguai	€ 400 mil
25	CA Rentistas
Ignacio Mujica	Ignacio Mujica 
Lateral Dir.
07/06/2006 (19)	Uruguai	€ 250 mil
18	CA Juventud B
Mauricio Rodríguez	Mauricio Rodríguez
Lateral Dir.
06/06/2005 (20)	Uruguai	€ 50 mil
22	Club Nacional
Rodrigo Chagas	Rodrigo Chagas
Volante
20/08/2003 (22)	Uruguai	€ 600 mil
19	CA San Lorenzo de Almagro
Emanuel Cecchini	Emanuel Cecchini
Volante
24/12/1996 (29)	Argentina
Itália	€ 300 mil
14	CA Vélez Sarsfield
Leonel Roldán	Leonel Roldán
Volante
10/10/2004 (21)	Argentina	€ 250 mil
37	CA Rosario Central
Ramiro Peralta	Ramiro Peralta
Meia Central
22/04/2003 (23)	Argentina	€ 750 mil
21	
Facundo Pérez	Facundo Pérez
Meia Central
23/03/2000 (26)	Uruguai
França	€ 350 mil
8	
Mateo Izaguirre	Mateo Izaguirre
Meia Central
24/05/2003 (22)	Uruguai	€ 250 mil
31	
Iván Rodríguez	Iván Rodríguez 
Meia Direita
16/01/2001 (25)	Uruguai	€ 350 mil
26	Sem clube
Gastón Pereiro	Gastón Pereiro
Meia Ofensivo
11/06/1995 (30)	Uruguai	€ 250 mil
30	CA Juventud B
Gonzalo Gómez	Gonzalo Gómez
Meia Ofensivo
13/12/2004 (21)	Uruguai	€ 250 mil
15	CA Peñarol
Alejo Cruz	Alejo Cruz
Ponta Esquerda
01/09/2000 (25)	Uruguai	€ 500 mil
27	
Martín Boselli	Martín Boselli
Ponta Esquerda
28/10/1994 (31)	Uruguai
Espanha	€ 100 mil
7	
Agustín Alaniz	Agustín Alaniz
Ponta Direita
16/05/2002 (23)	Uruguai	€ 400 mil
11	Juventud de Las Piedras U19
Pablo Lago	Pablo Lago
Ponta Direita
16/11/2006 (19)	Uruguai	€ 250 mil
20	Club Nacional
Renzo Sánchez	Renzo Sánchez
Ponta Direita
17/02/2004 (22)	Uruguai	€ 250 mil
10	Deportes Tolima
Bruno Larregui	Bruno Larregui 
Centroavante
07/03/2001 (25)	Uruguai	€ 500 mil
9	CA Huracán
Marcelo Pérez	Marcelo Pérez
Centroavante
23/03/2001 (25)	Paraguai	€ 400 mil
80	Burgos CF
Fernando Mimbacas	Fernando Mimbacas
Centroavante
26/03/2002 (24)	Uruguai	€ 300 mil
90	The Strongest La Paz
Sebastián Guerrero	Sebastián Guerrero
Centroavante
23/09/2000 (25)	Uruguai	€ 300 mil

        "uru-racingclubdemontevideo",
1	
Facundo Machado	Facundo Machado
Goleiro
19/01/2004 (22)	Uruguai
Itália	€ 300 mil
12	Sem clube
Federico Varese	Federico Varese
Goleiro
25/03/2003 (23)	Uruguai
Itália	€ 200 mil
3	
Ramiro Brazionis	Ramiro Brazionis
Zagueiro
15/12/2001 (24)	Uruguai	€ 500 mil
13	CA River Plate II
Felipe Álvarez	Felipe Álvarez
Zagueiro
02/05/2004 (22)	Argentina	€ 400 mil
2	Cerro Largo FC
Facundo Parada	Facundo Parada 
Zagueiro
28/01/2000 (26)	Uruguai	€ 300 mil
15	Argentinos Juniors U20
Diego Cheuquepal	Diego Cheuquepal
Lateral Esq.
17/12/2006 (19)	Argentina	€ 200 mil
17	
Martín Ferreira	Martín Ferreira
Lateral Esq.
07/03/1992 (34)	Uruguai	€ 200 mil
4	
Guillermo Cotugno	Guillermo Cotugno
Lateral Dir.
12/03/1995 (31)	Uruguai
Itália	€ 500 mil
29	Club Nacional
Facundo González	Facundo González
Lateral Dir.
10/05/2005 (20)	Uruguai	€ 400 mil
21	Montevideo City Torque
Agustín Álvarez	Agustín Álvarez 
Volante
20/04/2001 (25)	Uruguai	€ 600 mil
5	
Juan Pablo Bosca	Juan Pablo Bosca
Volante
13/04/2005 (21)	Uruguai	€ 400 mil
14	CD Union La Calera
Erik De Los Santos	Erik De Los Santos
Meia Central
16/01/1999 (27)	Uruguai	€ 500 mil
8	
Felipe Cairus	Felipe Cairus
Meia Central
28/04/2000 (26)	Uruguai
Itália	€ 450 mil
24	Club Atlético Terremoto
Juan Pérez	Juan Pérez
Meia Central
24/03/2002 (24)	Argentina
Itália	€ 200 mil
40	Club Estudiantes de La Plata
Axel Atum	Axel Atum
Meia Central
02/01/2006 (20)	Argentina	€ 150 mil
-	Colón FC de Uruguay
Rodrigo Teliz	Rodrigo Teliz
Meia Central
25/01/2005 (21)	Uruguai	€ 100 mil
7	
José Varela	José Varela 
Meia Central
29/05/1988 (37)	Uruguai	€ 25 mil
37	
Yuri Oyarzo	Yuri Oyarzo
Meia Esquerda
13/12/2007 (18)	Uruguai	€ 300 mil
39	
Álex Vázquez	Álex Vázquez
Meia Ofensivo
09/03/2002 (24)	Uruguai	€ 400 mil
11	CA Boston River
Franco Suárez	Franco Suárez
Ponta Esquerda
22/09/2003 (22)	Uruguai	€ 175 mil
19	Defensor Sporting Club
Rodrigo Dudok	Rodrigo Dudok
Ponta Esquerda
23/07/2007 (18)	Uruguai	€ 100 mil
16	
Esteban Da Silva	Esteban Da Silva
Ponta Direita
10/03/2001 (25)	Uruguai	€ 500 mil
20	
Agustín Kahl	Agustín Kahl
Ponta Direita
23/01/2004 (22)	Argentina	€ 25 mil
33	Miramar Misiones
Sebastián da Silva	Sebastián da Silva
Centroavante
28/04/2002 (24)	Uruguai	€ 400 mil
77	AMSD Atlético de Rafaela
Bautista Euclides Tomatis	Bautista Euclides Tomatis
Centroavante
11/08/2004 (21)	Argentina
Itália	€ 400 mil
81	CA Vélez Sarsfield II
Iván Manzur	Iván Manzur
Centroavante
26/01/2005 (21)	Argentina	€ 300 mil
23	
Nicolás Sosa	Nicolás Sosa
Centroavante
06/04/1996 (30)	Uruguai	€ 200 mil
9	
Hugo Silveira	Hugo Silveira
Centroavante
23/05/1993 (32)	Uruguai	€ 100 mil
18	CA Acassuso
Tomás Habib	Tomás Habib
Centroavante
01/05/2002 (24)	Argentina
Itália	-
        "uru-montevideocitytorque",
13	Rangers de Talca
Gastón Rodríguez	Gastón Rodríguez
Goleiro
12/02/1994 (32)	Uruguai
Chile	€ 150 mil
1	Unión Española
Franco Torgnascioli	Franco Torgnascioli
Goleiro
24/08/1990 (35)	Uruguai	€ 100 mil
17	
Eduardo Agüero	Eduardo Agüero
Zagueiro
14/02/2004 (22)	Uruguai	€ 400 mil
2	
Franco Romero	Franco Romero
Zagueiro
11/02/1995 (31)	Uruguai	€ 300 mil
27	Montevideo City Torque B
José Tarán	José Tarán
Zagueiro
29/03/2005 (21)	Uruguai	€ 150 mil
34	
Fabricio Silveira	Fabricio Silveira 
Zagueiro
18/09/2004 (21)	Uruguai	€ 125 mil
3	CA Rosario Central
Kevin Silva	Kevin Silva
Zagueiro
16/04/2003 (23)	Argentina	€ 75 mil
24	
Gary Kagelmacher	Gary Kagelmacher 
Zagueiro
21/04/1988 (38)	Uruguai
Alemanha	€ 50 mil
26	CA Progreso
Facundo Silvera	Facundo Silvera
Lateral Esq.
20/01/1997 (29)	Uruguai	€ 400 mil
6	
Nahuel Leivas	Nahuel Leivas 
Lateral Esq.
29/06/2006 (19)	Uruguai	€ 300 mil
5	
Franco Pizzichillo	Franco Pizzichillo
Lateral Dir.
03/01/1996 (30)	Uruguai
Itália	€ 450 mil
15	
Ezequiel Busquets	Ezequiel Busquets
Lateral Dir.
24/10/2000 (25)	Uruguai
Itália	€ 400 mil
30	CA River Plate Montevideo
Juan Quintana	Juan Quintana
Lateral Dir.
04/01/2000 (26)	Uruguai	€ 300 mil
4	Club Plaza Colonia
Valentino Würth	Valentino Würth
Lateral Dir.
21/05/2007 (18)	Uruguai	€ 200 mil
8	
Pablo Siles	Pablo Siles
Volante
15/07/1997 (28)	Uruguai	€ 450 mil
32	CA Cerro
Sebastián Cáceres	Sebastián Cáceres
Meia Central
15/01/2000 (26)	Uruguai	€ 400 mil
20	CF Universidad de Chile
Gonzalo Montes	Gonzalo Montes
Meia Central
22/12/1994 (31)	Uruguai
Itália	€ 350 mil
14	Club Estudiantes de La Plata
Bautista Kociubinski	Bautista Kociubinski
Meia Central
26/04/2001 (25)	Argentina
Itália	€ 300 mil
23	Montevideo City Torque B
Lucas Duré	Lucas Duré
Meia Central
21/10/2005 (20)	Uruguai	€ 250 mil
10	
Esteban Obregón	Esteban Obregón
Ponta Esquerda
24/10/2001 (24)	Argentina	€ 1.00 mi.
7	
Luka Andrade	Luka Andrade
Ponta Esquerda
03/01/2007 (19)	Argentina	€ 150 mil
29	
Facundo Martínez	Facundo Martínez
Ponta Esquerda
04/02/2008 (18)	Uruguai	-
19	
Diogo Guzmán	Diogo Guzmán
Ponta Direita
29/11/2005 (20)	Argentina	€ 450 mil
18	Montevideo City Torque U19
Ramiro Lecchini	Ramiro Lecchini
Ponta Direita
24/07/2007 (18)	Uruguai
Croácia	€ 100 mil
9	CSD Colo-Colo
Salomón Rodríguez	Salomón Rodríguez
Centroavante
16/02/2000 (26)	Uruguai	€ 1.00 mi.
11	
Nahuel Da Silva	Nahuel Da Silva
Centroavante
09/04/2005 (21)	Uruguai	€ 250 mil
31	Salto F.C.
Andrés Muñoz	Andrés Muñoz
Centroavante
30/07/2006 (19)	Uruguai	-
        "uru-bostonriver",
1	
Bruno Antúnez	Bruno Antúnez
Goleiro
31/01/2003 (23)	Uruguai	€ 800 mil
12	Club Atlético Tucumán
Juan González	Juan González
Goleiro
10/07/1993 (32)	Uruguai
México	€ 100 mil
23	
Mateo Rivero	Mateo Rivero
Zagueiro
22/09/2004 (21)	Uruguai	€ 600 mil
3	
Marco Mancebo	Marco Mancebo
Zagueiro
02/05/2001 (25)	Uruguai	€ 300 mil
13	Club Nacional U19
Ignacio Fernandez	Ignacio Fernandez
Zagueiro
11/12/2008 (17)	Uruguai	€ 250 mil
30	
Martín González	Martín González 
Zagueiro
03/06/1994 (31)	Uruguai	€ 200 mil
25	CA Nueva Chicago
Agustín Aguirre	Agustín Aguirre
Zagueiro
01/01/2004 (22)	Argentina	€ 150 mil
2	CA Boston River B
Kevin Sotto	Kevin Sotto
Zagueiro
22/01/2006 (20)	Uruguai	-
22	
Fredy Martínez	Fredy Martínez
Lateral Esq.
01/05/2001 (25)	Uruguai	€ 500 mil
24	
Jairo O'Neil	Jairo O'Neil
Lateral Esq.
31/07/2001 (24)	Uruguai	€ 150 mil
15	Club Nacional
Lautaro Vázquez	Lautaro Vázquez
Lateral Dir.
07/05/2006 (19)	Uruguai	€ 450 mil
17	Club Nacional
Rafael Haller	Rafael Haller
Lateral Dir.
17/08/2000 (25)	Uruguai	€ 400 mil
31	
Juan Acosta	Juan Acosta
Lateral Dir.
11/11/1993 (32)	Uruguai	€ 300 mil
14	CA Rentistas
Federico Dafonte	Federico Dafonte
Volante
08/12/2004 (21)	Uruguai
Alemanha	€ 200 mil
10	
Agustín Amado	Agustín Amado
Meia Central
06/02/2001 (25)	Uruguai	€ 500 mil
6	Monagas SC
Andrés Romero	Andrés Romero
Meia Central
07/03/2003 (23)	Venezuela	€ 400 mil
5	Defensor Sporting Club
Francisco Barrios	Francisco Barrios
Meia Central
19/02/2002 (24)	Uruguai
Itália	€ 325 mil
11	Miramar Misiones
Gastón Ramírez	Gastón Ramírez
Meia Central
02/12/1990 (35)	Uruguai	€ 100 mil
26	
Facundo Muñoa	Facundo Muñoa
Meia Ofensivo
11/06/2004 (21)	Uruguai	€ 400 mil
32	AA Argentinos Juniors
Yair González	Yair González
Meia Ofensivo
21/03/2002 (24)	Argentina	€ 400 mil
21	CA Rentistas
Franco Pérez	Franco Pérez
Ponta Esquerda
01/08/2001 (24)	Uruguai	€ 300 mil
16	CA Sarmiento (Junín)
Leandro Suhr	Leandro Suhr
Ponta Direita
24/09/1997 (28)	Uruguai	€ 350 mil
99	Racing Club II
Gonzalo Reyna	Gonzalo Reyna
Ponta Direita
23/07/2006 (19)	Argentina	€ 25 mil
8	Miami FC
Francisco Bonfiglio	Francisco Bonfiglio
Centroavante
02/01/2002 (24)	Argentina
Itália	€ 300 mil
9	
Alexander González	Alexander González
Centroavante
08/08/2002 (23)	Uruguai	€ 250 mil
7	
Facundo Rodríguez	Facundo Rodríguez
Centroavante
20/08/1995 (30)	Uruguai	€ 200 mil
-	Deportivo La Guaira
Brayan Alcocer	Brayan Alcocer
Centroavante
17/08/2003 (22)	Venezuela	€ 50 mil
28	CA Rentistas
Francisco Martinicorena	Francisco Martinicorena
Centroavante
09/02/2004 (22)	Uruguai	€ 25 mil
        "uru-montevideowanderers",
1	Club Oriental
Agustín Buffa	Agustín Buffa
Goleiro
08/01/1998 (28)	Uruguai	€ 400 mil
12	FC Danubio Montevideo
José Río	José Río
Goleiro
31/01/2004 (22)	Uruguai	€ 150 mil
13	Unión Española
Fabricio Formiliano	Fabricio Formiliano
Zagueiro
14/01/1993 (33)	Uruguai
Itália	€ 400 mil
14	
Mateo Acosta	Mateo Acosta
Zagueiro
04/03/2003 (23)	Uruguai	€ 400 mil
21	CA Peñarol
Santiago Benítez	Santiago Benítez
Zagueiro
12/08/2003 (22)	Uruguai	€ 300 mil
6	
Leandro Zazpe	Leandro Zazpe
Zagueiro
29/04/1994 (32)	Uruguai	€ 250 mil
23	CA Progreso
Nicolás Olivera	Nicolás Olivera
Zagueiro
17/02/1993 (33)	Uruguai	€ 200 mil
2	
Paulo Lima	Paulo Lima
Zagueiro
20/01/1992 (34)	Uruguai	€ 125 mil
3	
Guillermo Borthagaray	Guillermo Borthagaray 
Lateral Esq.
31/07/2005 (20)	Uruguai	€ 175 mil
15	Real CD España
Darlin Mencía	Darlin Mencía
Lateral Esq.
09/04/2003 (23)	Honduras	€ 75 mil
18	CA River Plate II
Lisandro Bajú	Lisandro Bajú
Lateral Esq.
18/07/2005 (20)	Argentina	-
8	Defensor Sporting Club
Nahuel Furtado	Nahuel Furtado
Lateral Dir.
20/03/1998 (28)	Uruguai	€ 600 mil
17	Cerro Largo FC
Alan García	Alan García
Lateral Dir.
14/09/1999 (26)	Uruguai	€ 400 mil
5	
Nicolás Queiróz	Nicolás Queiróz
Volante
07/05/1996 (29)	Uruguai	€ 300 mil
31	Goiás EC
Gonzalo Freitas	Gonzalo Freitas
Volante
02/10/1991 (34)	Uruguai	€ 150 mil
70	Montevideo Wanderers U19
Martín Bértola	Martín Bértola
Meio-Campo
25/04/2006 (20)	Uruguai	€ 25 mil
-	CA Peñarol
Sergi Oriol	Sergi Oriol 
Volante
24/04/2004 (22)	Espanha	-
16	Jeonnam Dragons
José Alberti	José Alberti
Meia Central
29/03/1997 (29)	Uruguai	€ 450 mil
-	Montevideo Wanderers U19
Mateo Martínez	Mateo Martínez
Meia Central
27/05/2006 (19)	Uruguai	€ 125 mil
11	CA River Plate II
Jonás Luna	Jonás Luna
Meia Ofensivo
10/05/2005 (20)	Argentina	€ 300 mil
-	Clube do Remo
Nicolás Ferreira	Nicolás Ferreira
Ponta Esquerda
07/02/2002 (24)	Uruguai	€ 700 mil
7	
Rodrigo Rivero	Rodrigo Rivero
Ponta Esquerda
27/12/1995 (30)	Uruguai	€ 400 mil
10	Atlético Goianiense
Luciano Cosentino	Luciano Cosentino 
Ponta Direita
18/05/2001 (24)	Uruguai	€ 450 mil
30	Sem clube
Facundo Labandeira	Facundo Labandeira
Ponta Direita
03/03/1996 (30)	Uruguai	€ 400 mil
-	
Juan Rodríguez	Juan Rodríguez
Ponta Direita
22/09/2006 (19)	Uruguai	€ 250 mil
24	
Pablo Suárez	Pablo Suárez
Ponta Direita
15/11/2005 (20)	Uruguai	€ 125 mil
80	CA Juventud
Jonathan Urretaviscaya	Jonathan Urretaviscaya 
Ponta Direita
19/03/1990 (36)	Uruguai
Espanha	€ 50 mil
26	
Santiago Guzmán	Santiago Guzmán
Seg. Atacante
08/03/2004 (22)	Uruguai	€ 150 mil
29	
Esteban Crucci	Esteban Crucci
Centroavante
05/07/2006 (19)	Uruguai	€ 300 mil
19	
Joaquín Zeballos	Joaquín Zeballos
Centroavante
13/11/1996 (29)	Uruguai	€ 250 mil
70	Universidad de Concepción
Mateo Levato	Mateo Levato
Centroavante
07/06/1996 (29)	Argentina	€ 175 mil
        "uru-centralespanol",
1	Liverpool FC Montevideo
Emiliano Márquez	Emiliano Márquez
Goleiro
02/09/2002 (23)	Uruguai	€ 150 mil
39	
Rodolfo	Rodolfo
Goleiro
19/03/1991 (35)	Brasil	€ 100 mil
12	Club Nacional B
Samuel Rodríguez	Samuel Rodríguez
Goleiro
19/03/2006 (20)	Uruguai	-
2	Liverpool FC Montevideo
Ignacio Rodríguez	Ignacio Rodríguez
Zagueiro
10/11/2003 (22)	Uruguai	€ 400 mil
13	CA Juventud
Logan Ponce	Logan Ponce 
Zagueiro
25/01/2002 (24)	Uruguai	€ 300 mil
6	
Mateo Urrutia	Mateo Urrutia 
Zagueiro
02/06/2003 (22)	Uruguai	€ 100 mil
14	
Alejandro Villoldo	Alejandro Villoldo 
Zagueiro
08/08/1989 (36)	Uruguai	€ 25 mil
22	
Ernesto Aramburú	Ernesto Aramburú
Zagueiro
22/02/1999 (27)	Uruguai	€ 25 mil
-	Defensor Sporting Club B
Juan Herrera	Juan Herrera
Zagueiro
20/01/2005 (21)	Uruguai	-
11	
Lautaro Gandulfo	Lautaro Gandulfo
Lateral Esq.
25/02/2004 (22)	Uruguai	€ 300 mil
26	CA Atenas de San Carlos
César Nunes	César Nunes
Lateral Esq.
30/09/1999 (26)	Brasil	€ 250 mil
3	
Juan Ignacio Dupont	Juan Ignacio Dupont
Lateral Esq.
22/07/2004 (21)	Uruguai	€ 75 mil
17	
Luciano Fernández	Luciano Fernández
Lateral Dir.
16/02/2002 (24)	Uruguai	€ 400 mil
5	Millonarios Bogotá
Sander Navarro	Sander Navarro
Lateral Dir.
22/07/2003 (22)	Colômbia	€ 200 mil
15	
Mateo Cantera	Mateo Cantera
Lateral Dir.
20/03/2001 (25)	Uruguai	€ 150 mil
24	
Guillermo Gandolfo	Guillermo Gandolfo
Volante
13/08/2002 (23)	Uruguai	€ 500 mil
4	CD Olimpia
Marcos Montiel	Marcos Montiel
Volante
12/07/1995 (30)	Uruguai	€ 300 mil
16	Uruguay Montevideo FC
Isaac Méndez	Isaac Méndez
Volante
19/04/2001 (25)	Uruguai	€ 200 mil
-	
Juber Pereira	Juber Pereira
Volante
13/01/2003 (23)	Uruguai	€ 100 mil
7	
Franco Muñoz	Franco Muñoz
Meia Central
06/02/1999 (27)	Uruguai	€ 300 mil
-	Club Atlético Tigre
Sebastián Sánchez	Sebastián Sánchez
Meia Central
02/02/2002 (24)	Argentina
Espanha	€ 200 mil
-	Liverpool FC Montevideo
Lucas Wasilewsky	Lucas Wasilewsky
Meia Central
21/04/2003 (23)	Uruguai	€ 200 mil
21	Montevideo City Torque
Lucas Pino	Lucas Pino
Meia Ofensivo
30/10/2005 (20)	Uruguai	€ 300 mil
18	
Facundo Yocco	Facundo Yocco
Meia Ofensivo
14/04/2001 (25)	Uruguai	€ 100 mil
30	San Antonio Bulo Bulo
Máximo Alonso	Máximo Alonso
Ponta Esquerda
05/07/2002 (23)	Uruguai
Espanha	€ 275 mil
32	CA Atenas de San Carlos
Mariano Aguilera	Mariano Aguilera
Ponta Direita
07/12/2003 (22)	Argentina	€ 400 mil
8	
Fernando Camarda	Fernando Camarda 
Ponta Direita
08/11/2003 (22)	Uruguai	€ 350 mil
25	CA Fénix
Facundo Milán	Facundo Milán
Centroavante
03/02/2001 (25)	Uruguai	€ 300 mil
27	CA Boston River
Facundo Sosa	Facundo Sosa
Centroavante
17/01/2003 (23)	Uruguai	€ 300 mil
-	
Santiago Sequeira	Santiago Sequeira 
Centroavante
20/11/2004 (21)	Uruguai	€ 200 mil
10	Sem clube
Rodrigo Muniz	Rodrigo Muniz
Centroavante
01/09/2001 (24)	Uruguai
Itália	€ 175 mil
-	Uruguay Montevideo FC
Facundo Borges	Facundo Borges
Centroavante
14/02/2003 (23)	Uruguai	€ 150 mil
23	Montevideo City Torque B
Ignacio Gonella	Ignacio Gonella
Centroavante
19/11/2004 (21)	Uruguai	€ 100 mil
-	CA Boston River
Nicolás Campos	Nicolás Campos
Centroavante
04/05/2005 (21)	Uruguai	€ 75 mil
19	Defensor Sporting Club B
Matías Kusmanis	Matías Kusmanis
Centroavante
14/04/2004 (22)	Uruguai
França	€ 25 mil
9	
Raúl Tarragona	Raúl Tarragona
Centroavante
06/03/1987 (39)	Uruguai	€ 10 mil
20	CA Atenas de San Carlos
Diego Vera	Diego Vera
Centroavante
05/01/1985 (41)	Uruguai	€ 10 mil
        "uru-clubdeportivomaldonado",
1	
Adriano Freitas	Adriano Freitas
Goleiro
17/06/1997 (28)	Uruguai	€ 300 mil
25	CA Independiente
Diego Segovia	Diego Segovia
Goleiro
15/05/2000 (25)	Uruguai	€ 300 mil
32	
Hernán Petryk	Hernán Petryk
Zagueiro
21/10/1994 (31)	Uruguai
Polónia	€ 300 mil
33	CA Cerro
Nicolás Fuica	Nicolás Fuica
Zagueiro
03/05/2004 (22)	Uruguai
Itália	€ 300 mil
42	Deportes La Serena
Joaquín Fernández	Joaquín Fernández
Zagueiro
22/01/1999 (27)	Uruguai
Itália	€ 300 mil
3	
Hernán Menosse	Hernán Menosse
Zagueiro
28/04/1987 (39)	Uruguai
Itália	€ 25 mil
19	
Facundo Tealde	Facundo Tealde 
Zagueiro
15/03/1989 (37)	Uruguai	€ 10 mil
24	
Bautista Biffi	Bautista Biffi
Zagueiro
02/08/2001 (24)	Argentina	-
20	
Sebastián Tormo	Sebastián Tormo
Lateral Esq.
28/12/2000 (25)	Uruguai	€ 400 mil
22	Club Plaza Colonia
Juan Ramos	Juan Ramos
Lateral Esq.
01/09/1996 (29)	Uruguai
Itália	€ 325 mil
4	CA Agropecuario
Juan Martín Ginzo	Juan Martín Ginzo
Lateral Dir.
05/03/2002 (24)	Argentina
Espanha	€ 200 mil
31	
Franco Marino	Franco Marino
Lateral Dir.
23/02/2007 (19)	Argentina
Itália	€ 25 mil
28	
Santiago Cartagena	Santiago Cartagena
Volante
01/09/2002 (23)	Uruguai	€ 600 mil
5	
Lucas Núñez	Lucas Núñez
Volante
09/06/2001 (24)	Uruguai	€ 300 mil
8	CA Lanús
Maximiliano González	Maximiliano González
Volante
04/05/2004 (22)	Argentina	€ 300 mil
15	
Sebastián González	Sebastián González
Volante
11/02/2000 (26)	Uruguai	€ 275 mil
23	Rampla Juniors Futbol Club
Adrian Vila	Adrian Vila
Meia Central
01/01/2002 (24)	Uruguai	€ 150 mil
17	
Bruno Centeno	Bruno Centeno
Meia Direita
20/03/2005 (21)	Uruguai	€ 50 mil
21	
Matías Espíndola	Matías Espíndola
Meia Ofensivo
26/11/2003 (22)	Argentina	€ 500 mil
11	Club Nacional
Guillermo López	Guillermo López
Ponta Esquerda
15/01/2003 (23)	Uruguai	€ 400 mil
17	
Santiago Ramírez	Santiago Ramírez
Ponta Esquerda
03/09/2001 (24)	Uruguai
Itália	€ 200 mil
7	
Gonzalo Larrazábal	Gonzalo Larrazábal
Ponta Esquerda
04/11/2002 (23)	Uruguai	€ 150 mil
14	Rampla Juniors Futbol Club
Christian Tabó	Christian Tabó
Ponta Direita
23/11/1993 (32)	Uruguai	€ 300 mil
16	
Renato César	Renato César
Ponta Direita
16/08/1993 (32)	Uruguai	€ 200 mil
10	
Maximiliano Noble	Maximiliano Noble
Seg. Atacante
13/09/1997 (28)	Uruguai	€ 600 mil
99	Vila Nova FC
Bruno Mendes	Bruno Mendes
Centroavante
02/08/1994 (31)	Brasil	€ 300 mil
9	
Elías de León	Elías de León
Centroavante
17/08/2005 (20)	Uruguai	€ 200 mil
29	Club Sportivo Italiano
Emiliano Mozzone	Emiliano Mozzone
Centroavante
23/04/1998 (28)	Uruguai
Itália	-
        "uru-albion",
1	
Sebastián Jaume	Sebastián Jaume
Goleiro
26/06/2004 (21)	Uruguai
Holanda	€ 500 mil
31	CA Atenas de San Carlos
Danilo Lerda	Danilo Lerda
Goleiro
30/03/1987 (39)	Argentina
Uruguai	€ 10 mil
24	
Ezequiel Burdín	Ezequiel Burdín
Zagueiro
16/10/2004 (21)	Uruguai	€ 500 mil
17	Club Nacional
Matías De los Santos	Matías De los Santos
Zagueiro
22/11/1992 (33)	Uruguai	€ 250 mil
13	
Pablo Lacoste	Pablo Lacoste 
Zagueiro
15/01/1988 (38)	Uruguai	€ 10 mil
2	Deportivo LSM
Francisco Couture	Francisco Couture
Zagueiro
05/08/2003 (22)	Uruguai
Itália	-
16	Defensor Sporting Club
José Álvarez	José Álvarez
Lateral Esq.
27/12/1994 (31)	Uruguai	€ 400 mil
29	
Federico Puente	Federico Puente
Lateral Esq.
29/12/1995 (30)	Uruguai	€ 350 mil
34	Racing Club de Montevideo
Agustín Pereira	Agustín Pereira
Lateral Dir.
24/03/2001 (25)	Uruguai	€ 400 mil
25	
Andrés Romero	Andrés Romero
Lateral Dir.
08/06/1998 (27)	Uruguai	€ 300 mil
6	
Tomás Moschión	Tomás Moschión
Volante
02/06/2000 (25)	Argentina	€ 400 mil
8	
Octavio Perdomo	Octavio Perdomo
Volante
25/01/2000 (26)	Uruguai	€ 200 mil
15	
Pablo Alcoba	Pablo Alcoba
Volante
10/11/2008 (17)	Uruguai
Espanha	€ 25 mil
5	Defensor Sporting Club
Francisco Ginella	Francisco Ginella
Meia Central
21/01/1999 (27)	Uruguai
Itália	€ 450 mil
27	Sem clube
Santiago Costa	Santiago Costa
Meia Central
12/02/2000 (26)	Uruguai	€ 400 mil
20	
Román Gutiérrez	Román Gutiérrez
Meia Central
27/09/2004 (21)	Uruguai	€ 50 mil
80	
Leonardo Pais	Leonardo Pais
Meia Direita
07/07/1994 (31)	Uruguai	€ 250 mil
22	Club Nacional
Agustín Vera	Agustín Vera
Ponta Esquerda
02/01/2004 (22)	Uruguai	€ 400 mil
11	Club Deportivo Maldonado
Hernán Toledo	Hernán Toledo
Ponta Esquerda
17/01/1996 (30)	Argentina	€ 350 mil
79	CA Nueva Chicago
Nahuel Roldán	Nahuel Roldán
Ponta Esquerda
21/12/1998 (27)	Uruguai	€ 250 mil
21	CA San Miguel
Lucas Rodríguez	Lucas Rodríguez
Ponta Esquerda
25/02/1997 (29)	Uruguai	€ 200 mil
14	
Mateo Alcoba	Mateo Alcoba
Ponta Esquerda
10/11/2008 (17)	Uruguai
Espanha	-
10	
Carlos Airala	Carlos Airala
Ponta Direita
25/08/2002 (23)	Argentina	€ 350 mil
30	Deportes Copiapó
Briam Acosta	Briam Acosta
Ponta Direita
07/09/1997 (28)	Uruguai	€ 350 mil
9	Club Plaza Colonia
Álvaro López	Álvaro López
Centroavante
06/08/1998 (27)	Argentina	€ 450 mil
32	Deportes Antofagasta
Tobías Figueroa	Tobías Figueroa
Centroavante
04/02/1992 (34)	Argentina	€ 150 mil
        "uru-cerrolargo",
1	Miramar Misiones
Juan Moreno	Juan Moreno
Goleiro
09/07/1999 (26)	Colômbia	€ 400 mil
12	Olimpia Asunción
Pedro González	Pedro González
Goleiro
21/02/1999 (27)	Paraguai	€ 200 mil
24	Miramar Misiones
Lukas González	Lukas González
Goleiro
11/02/2002 (24)	Uruguai	-
3	Tacuarembó FC
Alexis Piegas	Alexis Piegas
Zagueiro
11/02/2002 (24)	Uruguai	€ 300 mil
14	
Lucas Correa	Lucas Correa
Zagueiro
07/05/1996 (29)	Uruguai
Itália	€ 300 mil
28	Club Nacional B
Nicolás Ramos	Nicolás Ramos
Zagueiro
01/04/2005 (21)	Uruguai
Estados Unidos	€ 300 mil
2	Club Oriental
Gabriel Chocobar	Gabriel Chocobar
Zagueiro
05/08/1999 (26)	Argentina	€ 250 mil
16	Sem clube
Matías Fracchia	Matías Fracchia
Zagueiro
21/09/1995 (30)	Uruguai
Chile	€ 250 mil
20	CA Fénix
Santiago Franca	Santiago Franca
Lateral Esq.
26/10/2002 (23)	Uruguai	€ 200 mil
6	Club Ferro Carril Oeste
Mateo Monserrat	Mateo Monserrat
Lateral Esq.
31/01/2005 (21)	Argentina	€ 25 mil
4	CA Atenas de San Carlos
Fernando Souza	Fernando Souza
Lateral Dir.
24/05/1998 (27)	Uruguai	€ 300 mil
21	Montevideo City Torque
Julián Pou	Julián Pou
Lateral Dir.
21/11/2003 (22)	Uruguai	€ 250 mil
27	Cerro Largo FC U19
Facundo Alvez	Facundo Alvez
Lateral Dir.
28/10/2006 (19)	Uruguai	-
15	
Sebastián Assís	Sebastián Assís 
Volante
04/03/1993 (33)	Uruguai	€ 250 mil
25	CA River Plate Montevideo
Emiliano Jourdan	Emiliano Jourdan
Volante
03/02/2004 (22)	Uruguai	€ 200 mil
22	
Nicolás Bertocchi	Nicolás Bertocchi
Volante
09/06/1989 (36)	Argentina
Itália	€ 25 mil
5	Colón FC de Uruguay
Santiago Marcel	Santiago Marcel
Meia Central
17/03/2002 (24)	Uruguai	€ 300 mil
8	CA Progreso
Mario García	Mario García
Meia Central
08/09/1999 (26)	Uruguai	€ 250 mil
10	Miramar Misiones
Axel Pandiani	Axel Pandiani
Meia Ofensivo
23/08/2000 (25)	Uruguai
Itália	€ 200 mil
11	
Maximiliano Añasco	Maximiliano Añasco
Ponta Esquerda
04/05/2001 (25)	Uruguai	€ 600 mil
30	
Bruno Hernández	Bruno Hernández
Ponta Esquerda
17/09/2004 (21)	Uruguai	€ 250 mil
17	Racing Club de Montevideo
Alexander Hernández	Alexander Hernández
Ponta Direita
18/08/2004 (21)	Uruguai	€ 250 mil
9	CA River Plate Montevideo
Tiziano Correa	Tiziano Correa
Centroavante
31/08/2004 (21)	Uruguai
Itália	€ 300 mil
29	CA River Plate Montevideo B
Ihojan Pérez	Ihojan Pérez
Centroavante
17/02/2006 (20)	Uruguai	€ 150 mil
7	CA Boston River
Gustavo Viera	Gustavo Viera
Centroavante
21/10/2000 (25)	Uruguai	€ 125 mil
-	
Facundo Da Costa	Facundo Da Costa
Centroavante
20/03/2003 (23)	Uruguai	€ 50 mil
19	Club Villa Dálmine
Federico Sellecchia	Federico Sellecchia
Centroavante
02/07/1994 (31)	Argentina	€ 50 mil
13	Clube desconhecido
Borys Barone	Borys Barone
Centroavante
31/05/1994 (31)	Uruguai	-
23	
Thomas González	Thomas González
Centroavante
13/08/2004 (21)	Uruguai	-
18	Club Nacional B
Diego Daguerre	Diego Daguerre
Centroavante
29/04/2005 (21)	Uruguai	-
        "uru-danubiomontevideo",
1	
Mauro Goicoechea	Mauro Goicoechea
Goleiro
27/03/1988 (38)	Uruguai
Itália	€ 25 mil
32	
Kevin Martínez	Kevin Martínez
Goleiro
26/11/2005 (20)	Uruguai	-
2	
Emiliano Velázquez	Emiliano Velázquez
Zagueiro
30/04/1994 (32)	Uruguai	€ 300 mil
3	Correcaminos de la U.A.T.
Joaquín Pereyra	Joaquín Pereyra
Zagueiro
10/07/1994 (31)	Uruguai	€ 300 mil
4	CA Kimberley
Mateo Rinaldi	Mateo Rinaldi
Zagueiro
04/04/2000 (26)	Argentina	€ 300 mil
29	Sem clube
Martín Jourdan	Martín Jourdan
Zagueiro
13/10/2001 (24)	Uruguai	-
-	Danubio FC U19
Felipe Cabrera	Felipe Cabrera
Zagueiro
26/12/2006 (19)	Uruguai	-
31	CA Vélez Sarsfield
Tomás Cavanagh	Tomás Cavanagh
Lateral Esq.
05/01/2001 (25)	Argentina	€ 300 mil
-	
Facundo Saravia	Facundo Saravia 
Lateral Esq.
09/09/2002 (23)	Uruguai	€ 100 mil
6	
Leandro Sosa	Leandro Sosa 
Lateral Esq.
18/03/1991 (35)	Uruguai
Itália	€ 100 mil
-	Danubio FC B
Santiago Sosa	Santiago Sosa
Lateral Esq.
30/07/2008 (17)	Uruguai	-
40	Danubio FC B
Facundo Balatti	Facundo Balatti
Lateral Dir.
09/06/2008 (17)	Uruguai	€ 300 mil
18	CA Peñarol
Camilo Mayada	Camilo Mayada
Lateral Dir.
08/01/1991 (35)	Uruguai
Argentina	€ 100 mil
8	CF Universidad de Chile
Sebastián Rodríguez	Sebastián Rodríguez
Volante
16/08/1992 (33)	Uruguai
Espanha	€ 500 mil
16	CA Juventud
Iván Rossi	Iván Rossi
Volante
01/11/1993 (32)	Argentina
Itália	€ 350 mil
5	
Juan Millán	Juan Millán
Volante
13/08/2001 (24)	Uruguai	€ 250 mil
-	Danubio FC B
Máximo Cabral	Máximo Cabral
Volante
22/01/2006 (20)	Uruguai	€ 25 mil
15	Danubio FC U19
Emiliano Figueroa	Emiliano Figueroa
Meia Central
05/02/2007 (19)	Uruguai	-
17	
Alexander Velázquez	Alexander Velázquez
Meia Esquerda
09/04/2007 (19)	Uruguai	€ 150 mil
10	
Mateo Peralta	Mateo Peralta
Meia Ofensivo
08/04/2006 (20)	Uruguai	€ 600 mil
25	Club Sportivo Cerrito
Axel Montaña	Axel Montaña
Meia Ofensivo
13/02/2006 (20)	Uruguai	€ 200 mil
20	Colón FC de Uruguay
Maicol Ferreira	Maicol Ferreira
Ponta Direita
20/01/1998 (28)	Uruguai	€ 600 mil
28	
Enrique Femia	Enrique Femia
Ponta Direita
27/05/2002 (23)	Uruguai	€ 450 mil
7	IA Río Negro
Enzo Cabrera	Enzo Cabrera
Ponta Direita
19/11/2003 (22)	Uruguai
Itália	€ 300 mil
30	
Sebastián Fernández	Sebastián Fernández
Seg. Atacante
23/05/1985 (40)	Uruguai
Espanha	€ 25 mil
9	CA Belgrano
Ivo Costantino	Ivo Costantino
Centroavante
06/01/1999 (27)	Argentina	€ 200 mil
21	
Nicolas Azambuja	Nicolas Azambuja
Centroavante
28/03/2008 (18)	Uruguai	€ 200 mil
26	
Diego Píriz	Diego Píriz
Centroavante
22/02/2006 (20)	Uruguai	€ 50 mil
        "uru-progreso",
1	Academia Puerto Cabello
Andrés Mehring	Andrés Mehring
Goleiro
19/04/1994 (32)	Argentina	€ 200 mil
33	CA Fénix
Agustín Requena	Agustín Requena
Goleiro
09/12/1998 (27)	Uruguai	€ 100 mil
2	CD Motagua Tegucigalpa
Sebastián Cardozo	Sebastián Cardozo
Zagueiro
09/09/1995 (30)	Uruguai	€ 300 mil
13	
Hernán Carroso	Hernán Carroso
Zagueiro
06/01/2006 (20)	Uruguai	€ 250 mil
-	Sem clube
Gastón Silva	Gastón Silva
Zagueiro
05/03/1994 (32)	Uruguai
Itália	€ 200 mil
4	Club Nacional B
Marcos Paolini	Marcos Paolini
Zagueiro
14/08/2001 (24)	Uruguai
Itália	€ 200 mil
6	CA Sarmiento (Junín)
Federico Andueza	Federico Andueza
Zagueiro
25/05/1997 (28)	Uruguai
Itália	€ 200 mil
15	La Luz FC
Mauro Martín	Mauro Martín
Zagueiro
29/07/1999 (26)	Uruguai	€ 175 mil
14	Club Deportivo Maldonado
Facundo Kidd	Facundo Kidd
Lateral Esq.
04/08/1997 (28)	Uruguai	€ 300 mil
40	
Ayrton Cougo	Ayrton Cougo 
Lateral Esq.
15/06/1996 (29)	Uruguai	€ 300 mil
16	
Gianfranco Trasante	Gianfranco Trasante
Lateral Dir.
14/09/1999 (26)	Uruguai	€ 300 mil
5	
Agustín Pinheiro	Agustín Pinheiro
Volante
15/03/2002 (24)	Uruguai	€ 300 mil
8	
Adrián Colombino	Adrián Colombino 
Volante
12/10/1993 (32)	Uruguai	€ 300 mil
24	Amazonas FC
Santiago Viera	Santiago Viera
Volante
04/06/1998 (27)	Uruguai	€ 150 mil
22	CA Estudiantes
Agustin Paz	Agustin Paz
Meia Central
14/01/1999 (27)	Argentina	€ 150 mil
-	Club Nacional B
Alexis Cuadro	Alexis Cuadro
Meia Central
06/02/2006 (20)	Uruguai	-
18	
Gonzalo Silva	Gonzalo Silva
Meia Ofensivo
12/07/1999 (26)	Argentina	€ 200 mil
7	Al-Orooba FC
Fabricio Fernández	Fabricio Fernández
Meia Ofensivo
09/04/1993 (33)	Uruguai
Itália	€ 100 mil
10	Deportes Recoleta
Ignacio Lemmo	Ignacio Lemmo
Meia Ofensivo
13/01/1990 (36)	Uruguai
Itália	€ 50 mil
30	Club Atlético Terremoto
Agustín Codagnone	Agustín Codagnone
Meia Ofensivo
13/09/2005 (20)	Uruguai	-
21	
Juan Rivero	Juan Rivero
Ponta Esquerda
27/06/1999 (26)	Uruguai	€ 200 mil
20	CA Unión (Santa Fé)
José Vanetta	José Vanetta
Ponta Esquerda
28/11/2001 (24)	Argentina	€ 25 mil
17	CA River Plate Montevideo
Facundo de León	Facundo de León
Ponta Direita
01/05/2004 (22)	Uruguai	€ 250 mil
19	Club Atletico Progreso U19
Joaquín Solleiro	Joaquín Solleiro
Ponta Direita
18/02/2006 (20)	Uruguai	-
29	
Nicolás Fernández	Nicolás Fernández
Seg. Atacante
06/02/2003 (23)	Uruguai	€ 500 mil
11	Club Nacional B
Nahuel López	Nahuel López
Seg. Atacante
24/01/2007 (19)	Uruguai	€ 250 mil
93	Albion FC
Diego Sánchez	Diego Sánchez
Centroavante
30/07/1999 (26)	Uruguai	€ 325 mil
9	
Gary Silva	Gary Silva
Centroavante
09/01/2004 (22)	Uruguai	€ 150 mil
23	
Matteo Copelotti	Matteo Copelotti
Centroavante
16/02/2004 (22)	Uruguai
Itália	€ 150 mil
25	CA Artigas
Jonathan Dos Santos	Jonathan Dos Santos
Centroavante
18/04/1992 (34)	Uruguai	€ 125 mil
        "uru-clubplazacolonia",
25	CA River Plate Montevideo
Fabrizio Correa	Fabrizio Correa
Goleiro
18/01/2001 (25)	Uruguai	€ 300 mil
12	
Yonatan Irrazábal	Yonatan Irrazábal
Goleiro
12/02/1988 (38)	Uruguai	€ 25 mil
40	Club Nacional B
Diego Capdevila	Diego Capdevila
Goleiro
18/01/2003 (23)	Uruguai	-
16	Club Estudiantes de La Plata
Juan Cruz Guasone	Juan Cruz Guasone
Zagueiro
27/03/2001 (25)	Argentina
Itália	€ 175 mil
3	Defensor Sporting Club
Ariel Lima	Ariel Lima
Zagueiro
02/03/2005 (21)	Uruguai	€ 100 mil
20	CA All Boys
Facundo Butti	Facundo Butti
Zagueiro
02/03/2000 (26)	Argentina	€ 100 mil
23	Club Nacional B
Martín Farías	Martín Farías
Zagueiro
06/08/2004 (21)	Uruguai	€ 25 mil
6	Liverpool FC Montevideo
Francisco Bregante	Francisco Bregante
Lateral Esq.
18/04/2004 (22)	Uruguai	€ 400 mil
17	Deportes Santa Cruz
Gianni Rodríguez	Gianni Rodríguez
Lateral Esq.
07/06/1994 (31)	Uruguai	€ 175 mil
4	FC Danubio Montevideo
Mateo Argüello	Mateo Argüello
Lateral Dir.
10/07/2002 (23)	Uruguai	€ 200 mil
44	CA Fénix
Emanuel Carlos	Emanuel Carlos
Lateral Dir.
21/02/1999 (27)	Uruguai	€ 125 mil
24	CA Huracán
Iván Valenzuela	Iván Valenzuela
Lateral Dir.
24/05/2001 (24)	Argentina	€ 100 mil
22	CA Peñarol
Damián Suárez	Damián Suárez
Lateral Dir.
27/04/1988 (38)	Uruguai
Espanha	€ 25 mil
5	Monagas SC
Alejo Macelli	Alejo Macelli 
Volante
02/03/1998 (28)	Argentina	€ 400 mil
19	Miramar Misiones
Emiliano Sosa	Emiliano Sosa
Volante
18/02/1998 (28)	Uruguai	€ 200 mil
31	Club Nacional B
Jairo Amaro	Jairo Amaro
Volante
27/01/2003 (23)	Uruguai	€ 50 mil
8	
Agustín Miranda	Agustín Miranda
Meia Central
28/11/1992 (33)	Uruguai
Espanha	€ 200 mil
32	Club Nacional B
Rodrigo Mederos	Rodrigo Mederos
Meia Central
25/07/2005 (20)	Uruguai	€ 100 mil
41	Sem clube
Sebastián Cristóforo	Sebastián Cristóforo
Meia Central
23/08/1993 (32)	Uruguai
Itália	€ 75 mil
13	Club Nacional B
Brian Quinteros	Brian Quinteros
Meia Central
22/01/2005 (21)	Uruguai	-
35	CA Peñarol B
Pablo Nongoy	Pablo Nongoy
Meia Ofensivo
26/11/2003 (22)	Uruguai	€ 300 mil
10	Sem clube
Brahian Alemán	Brahian Alemán
Meia Ofensivo
23/12/1989 (36)	Uruguai	€ 75 mil
-	
Pablo Da Silveira	Pablo Da Silveira 
Meia Ofensivo
19/06/2004 (21)	Uruguai	€ 25 mil
18	Defensor Sporting Club B
Nahuel Sena	Nahuel Sena 
Ponta Esquerda
04/07/2004 (21)	Uruguai	€ 150 mil
21	Club Nacional
Axel Méndez	Axel Méndez
Ponta Esquerda
30/03/2005 (21)	Uruguai	€ 125 mil
27	Club Plaza Colonia
Cristian Barros	Cristian Barros
Ponta Direita
09/04/2000 (26)	Uruguai	€ 300 mil
7	Racing Club de Montevideo
Alejandro Severo	Alejandro Severo
Ponta Direita
27/08/2005 (20)	Uruguai	€ 200 mil
77	Sem clube
Matías Ocampo	Matías Ocampo
Ponta Direita
14/03/2002 (24)	Uruguai	€ 200 mil
28	Defensor Sporting Club
Augusto Cambón	Augusto Cambón
Centroavante
17/01/2005 (21)	Uruguai	€ 200 mil
9	Tlaxcala FC
Bruno Morales	Bruno Morales
Centroavante
10/12/2004 (21)	Uruguai	€ 175 mil
29	Club Deportivo Guabirá
Santiago Paiva	Santiago Paiva
Centroavante
11/01/1999 (27)	Uruguai	€ 150 mil
14	Liverpool FC Montevideo
Nahuel Soria	Nahuel Soria
Centroavante
23/01/2002 (24)	Uruguai	€ 125 mil
-	FBC Gravina
Mariano Nichele	Mariano Nichele
Centroavante
26/09/2000 (25)	Uruguai
Itália	€ 50 mil
15	CA Cerro U19
Alan Zamurio	Alan Zamurio
Centroavante
24/01/2008 (18)	Uruguai	-
30	Club Atletico Progreso U19
Jeison Cubas	Jeison Cubas
Atacante
20/08/2006 (19)	Perú
Uruguai	-
33	Club Nacional B
Tiago Rijo	Tiago Rijo
Centroavante
14/06/2005 (20)	Uruguai	-
        "uru-rentistas",
1	La Luz FC
Ramiro Méndez	Ramiro Méndez
Goleiro
07/01/2001 (25)	Uruguai	€ 150 mil
13	
Carlos Techera	Carlos Techera
Goleiro
28/04/1992 (34)	Uruguai	€ 50 mil
12	
Facundo Pastorino	Facundo Pastorino
Goleiro
08/08/2008 (17)	Uruguai	-
20	
Lautaro Dufur	Lautaro Dufur
Zagueiro
17/10/2006 (19)	Uruguai	€ 250 mil
25	
Agustín García	Agustín García
Zagueiro
26/02/2001 (25)	Uruguai	€ 250 mil
3	Miramar Misiones
Sebastián Diana	Sebastián Diana
Zagueiro
02/08/1990 (35)	Uruguai	€ 50 mil
30	Uruguay Montevideo FC
Pablo Pírez	Pablo Pírez
Zagueiro
08/01/1990 (36)	Uruguai	€ 10 mil
23	Sem clube
Kevin Rolón	Kevin Rolón
Lateral Esq.
02/03/2001 (25)	Uruguai	€ 600 mil
16	
Simón Bentancur	Simón Bentancur
Lateral Esq.
23/04/2003 (23)	Uruguai	€ 150 mil
21	CA River Plate Montevideo
Franco Cabrera	Franco Cabrera
Lateral Esq.
21/07/2004 (21)	Uruguai	€ 150 mil
18	
Facundo Vega	Facundo Vega
Lateral Dir.
18/08/1998 (27)	Uruguai
Lituânia	€ 350 mil
17	Club Deportivo Maldonado
Joel Poiso	Joel Poiso
Lateral Dir.
26/06/2004 (21)	Uruguai	€ 200 mil
-	
Agustín Rodríguez	Agustín Rodríguez
Meio-Campo
04/01/2005 (21)	Uruguai	€ 25 mil
5	
Nicolás Pintado	Nicolás Pintado
Meia Central
24/03/2000 (26)	Uruguai	€ 300 mil
7	CA Atenas de San Carlos
Juan Pablo Plada	Juan Pablo Plada
Meia Central
06/08/1998 (27)	Uruguai	€ 300 mil
14	
Nicolás Mallet	Nicolás Mallet
Meia Central
21/09/2000 (25)	Uruguai
Ucrânia	€ 300 mil
29	CA Artigas
Franco Martínez	Franco Martínez
Meia Central
26/11/1998 (27)	Uruguai	€ 200 mil
6	CA Rentistas U19
Facundo Carámbula	Facundo Carámbula
Meia Central
12/09/2007 (18)	Uruguai	-
10	
Jean Franco Martínez	Jean Franco Martínez
Meia Esquerda
08/01/2004 (22)	Uruguai	€ 225 mil
8	
Carlos Sánchez	Carlos Sánchez 
Meia Ofensivo
02/12/1984 (41)	Uruguai
Argentina	€ 10 mil
19	Club Sportivo Cerrito
Juan Moreira	Juan Moreira
Ponta Esquerda
31/05/1998 (27)	Uruguai	€ 200 mil
24	Danubio FC U19
Fabricio Roldán	Fabricio Roldán
Ponta Esquerda
22/05/2005 (20)	Uruguai	-
22	La Luz FC
Horacio Sequeira	Horacio Sequeira
Ponta Direita
30/09/1995 (30)	Uruguai	€ 200 mil
11	Club Nacional B
Luciano Inverso	Luciano Inverso
Ponta Direita
22/03/2005 (21)	Uruguai
Itália	€ 25 mil
9	Tacuarembó FC
Douglas Bittencourt	Douglas Bittencourt
Centroavante
30/08/1995 (30)	Brasil
Uruguai	€ 250 mil
-	
Carlos Tombolini	Carlos Tombolini 
Centroavante
19/09/1997 (28)	Argentina	€ 200 mil
15	
Michel Silveira	Michel Silveira
Centroavante
08/04/2002 (24)	Uruguai	€ 125 mil
28	
Luis Meneses	Luis Meneses
Centroavante
28/12/2006 (19)	República Dominicana
Estados Unidos	€ 25 mil
        "uru-cerro",
25	CA River Plate Montevideo
Fabrizio Correa	Fabrizio Correa
Goleiro
18/01/2001 (25)	Uruguai	€ 300 mil
12	
Yonatan Irrazábal	Yonatan Irrazábal
Goleiro
12/02/1988 (38)	Uruguai	€ 25 mil
40	Club Nacional B
Diego Capdevila	Diego Capdevila
Goleiro
18/01/2003 (23)	Uruguai	-
16	Club Estudiantes de La Plata
Juan Cruz Guasone	Juan Cruz Guasone
Zagueiro
27/03/2001 (25)	Argentina
Itália	€ 175 mil
3	Defensor Sporting Club
Ariel Lima	Ariel Lima
Zagueiro
02/03/2005 (21)	Uruguai	€ 100 mil
20	CA All Boys
Facundo Butti	Facundo Butti
Zagueiro
02/03/2000 (26)	Argentina	€ 100 mil
23	Club Nacional B
Martín Farías	Martín Farías
Zagueiro
06/08/2004 (21)	Uruguai	€ 25 mil
6	Liverpool FC Montevideo
Francisco Bregante	Francisco Bregante
Lateral Esq.
18/04/2004 (22)	Uruguai	€ 400 mil
17	Deportes Santa Cruz
Gianni Rodríguez	Gianni Rodríguez
Lateral Esq.
07/06/1994 (31)	Uruguai	€ 175 mil
4	FC Danubio Montevideo
Mateo Argüello	Mateo Argüello
Lateral Dir.
10/07/2002 (23)	Uruguai	€ 200 mil
44	CA Fénix
Emanuel Carlos	Emanuel Carlos
Lateral Dir.
21/02/1999 (27)	Uruguai	€ 125 mil
24	CA Huracán
Iván Valenzuela	Iván Valenzuela
Lateral Dir.
24/05/2001 (24)	Argentina	€ 100 mil
22	CA Peñarol
Damián Suárez	Damián Suárez
Lateral Dir.
27/04/1988 (38)	Uruguai
Espanha	€ 25 mil
5	Monagas SC
Alejo Macelli	Alejo Macelli 
Volante
02/03/1998 (28)	Argentina	€ 400 mil
19	Miramar Misiones
Emiliano Sosa	Emiliano Sosa
Volante
18/02/1998 (28)	Uruguai	€ 200 mil
31	Club Nacional B
Jairo Amaro	Jairo Amaro
Volante
27/01/2003 (23)	Uruguai	€ 50 mil
8	
Agustín Miranda	Agustín Miranda
Meia Central
28/11/1992 (33)	Uruguai
Espanha	€ 200 mil
32	Club Nacional B
Rodrigo Mederos	Rodrigo Mederos
Meia Central
25/07/2005 (20)	Uruguai	€ 100 mil
41	Sem clube
Sebastián Cristóforo	Sebastián Cristóforo
Meia Central
23/08/1993 (32)	Uruguai
Itália	€ 75 mil
13	Club Nacional B
Brian Quinteros	Brian Quinteros
Meia Central
22/01/2005 (21)	Uruguai	-
35	CA Peñarol B
Pablo Nongoy	Pablo Nongoy
Meia Ofensivo
26/11/2003 (22)	Uruguai	€ 300 mil
10	Sem clube
Brahian Alemán	Brahian Alemán
Meia Ofensivo
23/12/1989 (36)	Uruguai	€ 75 mil
-	
Pablo Da Silveira	Pablo Da Silveira 
Meia Ofensivo
19/06/2004 (21)	Uruguai	€ 25 mil
18	Defensor Sporting Club B
Nahuel Sena	Nahuel Sena 
Ponta Esquerda
04/07/2004 (21)	Uruguai	€ 150 mil
21	Club Nacional
Axel Méndez	Axel Méndez
Ponta Esquerda
30/03/2005 (21)	Uruguai	€ 125 mil
27	Club Plaza Colonia
Cristian Barros	Cristian Barros
Ponta Direita
09/04/2000 (26)	Uruguai	€ 300 mil
7	Racing Club de Montevideo
Alejandro Severo	Alejandro Severo
Ponta Direita
27/08/2005 (20)	Uruguai	€ 200 mil
77	Sem clube
Matías Ocampo	Matías Ocampo
Ponta Direita
14/03/2002 (24)	Uruguai	€ 200 mil
28	Defensor Sporting Club
Augusto Cambón	Augusto Cambón
Centroavante
17/01/2005 (21)	Uruguai	€ 200 mil
9	Tlaxcala FC
Bruno Morales	Bruno Morales
Centroavante
10/12/2004 (21)	Uruguai	€ 175 mil
29	Club Deportivo Guabirá
Santiago Paiva	Santiago Paiva
Centroavante
11/01/1999 (27)	Uruguai	€ 150 mil
14	Liverpool FC Montevideo
Nahuel Soria	Nahuel Soria
Centroavante
23/01/2002 (24)	Uruguai	€ 125 mil
-	FBC Gravina
Mariano Nichele	Mariano Nichele
Centroavante
26/09/2000 (25)	Uruguai
Itália	€ 50 mil
15	CA Cerro U19
Alan Zamurio	Alan Zamurio
Centroavante
24/01/2008 (18)	Uruguai	-
30	Club Atletico Progreso U19
Jeison Cubas	Jeison Cubas
Atacante
20/08/2006 (19)	Perú
Uruguai	-
33	Club Nacional B
Tiago Rijo	Tiago Rijo
Centroavante
14/06/2005 (20)	Uruguai	-
        "uru-riverplatemontevideo",
25	CA River Plate Montevideo B
José Arbio	José Arbio
Goleiro
21/01/2003 (23)	Uruguai	€ 25 mil
1	
Damián Frascarelli	Damián Frascarelli 
Goleiro
02/06/1985 (40)	Uruguai
Equador	€ 10 mil
-	CA Cerro
Emilio Crespo	Emilio Crespo 
Zagueiro
12/10/1996 (29)	Uruguai	€ 200 mil
2	
Facundo Pérez	Facundo Pérez
Zagueiro
15/11/2003 (22)	Uruguai	€ 200 mil
3	Club Deportes Iquique
Carlos Rodríguez	Carlos Rodríguez
Zagueiro
07/04/1990 (36)	Uruguai	€ 200 mil
4	Cerro Largo FC
Brian Ferrares	Brian Ferrares 
Zagueiro
01/03/2000 (26)	Uruguai	€ 200 mil
-	Sem clube
Maximiliano Perg	Maximiliano Perg
Zagueiro
16/09/1991 (34)	Uruguai	€ 75 mil
28	
Lorenzo González	Lorenzo González
Zagueiro
13/01/2005 (21)	Uruguai	€ 50 mil
-	
Rodrigo Cabrera	Rodrigo Cabrera
Lateral Esq.
07/08/2004 (21)	Uruguai	€ 150 mil
6	
Lucas Camejo	Lucas Camejo
Lateral Esq.
14/10/2006 (19)	Uruguai	€ 150 mil
17	Club Sportivo Cerrito
Mathías Rodríguez	Mathías Rodríguez
Lateral Esq.
20/06/1997 (28)	Uruguai	€ 100 mil
16	Miramar Misiones
Mauricio Gómez	Mauricio Gómez
Lateral Dir.
16/04/1992 (34)	Uruguai	€ 125 mil
8	La Luz FC
Matías De Los Santos	Matías De Los Santos
Volante
28/09/1998 (27)	Uruguai	€ 200 mil
20	CA River Plate Montevideo U19
Francisco Triver	Francisco Triver
Volante
18/04/2006 (20)	Uruguai	€ 125 mil
14	CA Rentistas
Tomás López	Tomás López
Volante
12/12/2004 (21)	Uruguai	€ 25 mil
10	CA Progreso
Alejandro García	Alejandro García
Meia Central
02/11/2000 (25)	Uruguai
Espanha	€ 350 mil
-	Unión Magdalena
Cristian Sención	Cristian Sención 
Meia Central
28/01/1996 (30)	Uruguai	€ 250 mil
33	CA Boston River
Felipe Chiappini	Felipe Chiappini
Meia Central
16/09/2003 (22)	Uruguai	€ 250 mil
-	
Mauro Estol	Mauro Estol
Meia Central
27/01/1995 (31)	Uruguai
Itália	€ 100 mil
19	FC Danubio Montevideo
Santiago Romero	Santiago Romero
Meia Central
15/02/1990 (36)	Uruguai	€ 50 mil
7	CA River Plate Montevideo U19
Matías Escobar	Matías Escobar
Meia Esquerda
14/10/2006 (19)	Uruguai	€ 125 mil
30	CA River Plate Montevideo B
Diego Sánchez	Diego Sánchez
Ponta Esquerda
03/06/2002 (23)	Uruguai	€ 25 mil
11	CA Fénix
Cristian Techera	Cristian Techera
Ponta Direita
31/05/1992 (33)	Uruguai	€ 150 mil
-	Sem clube
Gabriel Costa	Gabriel Costa
Ponta Direita
02/04/1990 (36)	Perú
Uruguai	€ 125 mil
22	Albion FC
Maximiliano Burruzo	Maximiliano Burruzo
Centroavante
13/01/2003 (23)	Uruguai	€ 300 mil
9	
Inti López	Inti López
Centroavante
19/08/2005 (20)	Itália
Uruguai	€ 250 mil
27	Club Oriental
Vitinho	Vitinho
Centroavante
14/05/2002 (23)	Brasil	€ 150 mil
32	Sem clube
Rodrigo Hernández	Rodrigo Hernández
Centroavante
31/01/2005 (21)	Uruguai	€ 100 mil
24	CA Los Andes II
Tomás Benardoni	Tomás Benardoni
Centroavante
10/04/2006 (20)	Argentina	-
        "uru-atenasdesancarlos"
1	
Francisco Coirolo	Francisco Coirolo
Goleiro
09/06/2001 (24)	Uruguai	€ 350 mil
12	
Marcos Donato	Marcos Donato
Goleiro
22/10/1999 (26)	Uruguai	-
25	
Nahuel Sosa	Nahuel Sosa
Goleiro
12/08/2005 (20)	Uruguai	-
2	Cerro Largo FC
Santiago Cappi	Santiago Cappi
Zagueiro
23/05/2003 (22)	Uruguai	€ 200 mil
3	
Geovani	Geovani 
Zagueiro
18/02/2000 (26)	Brasil	€ 175 mil
22	Colón FC de Uruguay
Matías González	Matías González
Zagueiro
23/11/1993 (32)	Uruguai	€ 150 mil
4	Sem clube
Maicol Borba	Maicol Borba
Zagueiro
09/05/2001 (24)	Uruguai	-
6	Tacuarembó FC
Lucas Medina	Lucas Medina
Lateral Esq.
31/03/1995 (31)	Argentina	€ 300 mil
16	Sem clube
Agustín Acosta	Agustín Acosta
Lateral Esq.
17/02/2001 (25)	Uruguai	€ 200 mil
21	
Vittorio Magno	Vittorio Magno
Lateral Dir.
21/02/2003 (23)	Uruguai
Itália	€ 150 mil
28	Tacuarembó FC
Pablo Fagúndez	Pablo Fagúndez
Lateral Dir.
16/07/1985 (40)	Uruguai	€ 10 mil
8	
Lucas Cascallares	Lucas Cascallares
Volante
01/07/1999 (26)	Uruguai	-
5	
Agustín Da Rocha	Agustín Da Rocha
Meia Central
25/01/2002 (24)	Uruguai	€ 300 mil
26	CA River Plate Montevideo
Guillermo Oroño	Guillermo Oroño
Meia Central
05/04/2005 (21)	Uruguai	€ 200 mil
15	
Mateo Molinari	Mateo Molinari
Meia Central
07/01/2005 (21)	Uruguai	€ 25 mil
40	CA Juventud B
Lautaro Vázquez	Lautaro Vázquez
Meia Central
24/08/2003 (22)	Uruguai	-
13	Sem clube
Guido Sosa	Guido Sosa
Meia Esquerda
20/05/2003 (22)	Uruguai	€ 150 mil
19	CA Juventud
Facundo Vigo	Facundo Vigo
Meia Ofensivo
22/05/1999 (26)	Uruguai	€ 200 mil
20	IA Sud América 
Fernando Chávez	Fernando Chávez
Meia Ofensivo
16/02/1999 (27)	Argentina	€ 200 mil
10	Rampla Juniors Futbol Club
Lucas Arzamendia	Lucas Arzamendia
Meia Ofensivo
23/02/1999 (27)	Argentina	€ 75 mil
7	CA Atenas de San Carlos U19
Maximiliano Rodríguez	Maximiliano Rodríguez
Meia Ofensivo
03/06/2006 (19)	Uruguai	-
14	Club Sportivo Cerrito
Lucas Bassadone	Lucas Bassadone
Ponta Esquerda
25/02/2003 (23)	Uruguai	€ 25 mil
11	Sem clube
Brian González	Brian González
Ponta Direita
11/06/1999 (26)	Uruguai	€ 25 mil
9	Colón FC de Uruguay
Agustín Navarro	Agustín Navarro
Centroavante
26/04/1997 (29)	Uruguai	€ 250 mil
80	Sem clube
Valentín Jara	Valentín Jara
Centroavante
29/03/1999 (27)	Argentina
Croácia	€ 175 mil
30	CA Cerro
Matías Núñez	Matías Núñez 
Centroavante
04/11/2002 (23)	Uruguai	€ 150 mil
24	Sem clube
Nicolás Suárez	Nicolás Suárez
Centroavante
13/04/1999 (27)	Uruguai	-
77	Real Montevideo FC
Ferreirinha	Ferreirinha
Centroavante
03/05/2002 (24)	Brasil	-
`;

/**
 * ─────────────────────────────────────────────
 * 3. TABELAS DE POSIÇÃO E ESPECIALIDADES
 * ─────────────────────────────────────────────
 */
const positionMap = {
    "Goleiro": "GK", "Zagueiro": "CB", "Lateral Esq.": "LB", "Lateral Dir.": "RB",
    "Volante": "CDM", "Meia Central": "CM", "Meia Direita": "RM", "Meia Esquerda": "LM",
    "Meia Ofensivo": "CAM", "Ponta Esquerda": "LW", "Ponta Direita": "RW",
    "Segundo Atacante": "CF", "Seg. Atacante": "CF", "Centroavante": "ST"
};

const specialties = {
    "GK":  ["Defense", "Passing", "Speed"],
    "CB":  ["Defense", "Speed", "Shooting"],
    "LB":  ["Speed", "Passing", "Defense"],
    "RB":  ["Speed", "Passing", "Defense"],
    "CDM": ["Defense", "Passing", "Speed"],
    "CM":  ["Passing", "Dribbling", "Shooting"],
    "RM":  ["Speed", "Passing", "Dribbling"],
    "LM":  ["Speed", "Passing", "Dribbling"],
    "CAM": ["Dribbling", "Shooting", "Passing"],
    "CF":  ["Shooting", "Dribbling", "Passing"],
    "ST":  ["Shooting", "Dribbling", "Speed"],
    "LW":  ["Speed", "Dribbling", "Shooting"],
    "RW":  ["Speed", "Dribbling", "Shooting"]
};

/**
 * ─────────────────────────────────────────────
 * 4. FUNÇÕES DE LIMPEZA
 * ─────────────────────────────────────────────
 */
function slugify(text) {
    return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

/**
 * Converte "€ 18.00 mi." → 18 (milhões).
 * Suporta mi, bi, mil e valor ausente.
 */
function parseValue(str) {
    if (!str) return 100_000;
    // Regex ajustado para pegar apenas 'mil', 'mi' ou 'bi' como palavra inteira
    const m = str.match(/€\s*([\d.,]+)\s*(mil|mi|bi)?(\.|\s|$)/i);
    if (!m) return 100_000;
    const v = parseFloat(m[1].replace(',', '.'));
    if (!m[2]) return v;
    const u = m[2].toLowerCase();
    if (u === 'bi')  return v * 1_000_000_000;
    if (u === 'mi')  return v * 1_000_000;
    if (u === 'mil') return v * 1_000;
    return v;
}


/**
 * Divide o RAW_DATA em blocos por jogador e extrai os campos linha a linha.
 * 1ª linha: ignora
 * 2ª linha: nome duplicado, pega só a primeira metade das palavras
 * 3ª linha: posição
 * 4ª linha: data, idade (entre parênteses ou não), nacionalidade, valor de mercado (pode estar aqui ou na próxima)
 * 5ª linha: se existir, pode ser segunda nacionalidade ou valor de mercado
 */
function parsePlayers(raw) {
    const blocks = raw
        .split(/(?=^(?:\d+|-)\t|^(?:\d+|-)\n)/m)
        .map(b => b.trim())
        .filter(b => /^(?:\d+|-)/.test(b));

    return blocks.map(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 4) return null;

        // 2ª linha: nome duplicado, pega o nome completo antes do tab
        let nameLine = lines[1] || '';
        let name = nameLine.split('\t')[0].trim(); // nome completo

        // 3ª linha: posição
        const posRaw = lines[2] ? lines[2].trim() : '';
        const pos    = positionMap[posRaw] || 'CM';

        // 4ª linha: data, idade, nacionalidade, valor de mercado (pode estar aqui ou na próxima)
        const line4 = lines[3] || '';
        // Idade: procura (idade) ou idade após data
        let age = 0;
        let ageMatch = line4.match(/\((\d+)\)/);
        if (ageMatch) {
            age = parseInt(ageMatch[1]);
        } else {
            // Tenta pegar idade após data
            let ageMatch2 = line4.match(/\d{2}\/\d{2}\/\d{4}[^\d]*(\d{2})/);
            if (ageMatch2) age = parseInt(ageMatch2[1]);
        }

        // Nacionalidade: pega a primeira após a data/idade
        // Divide por tab, pega o segundo campo, ou tenta pegar após idade
        let nat = '';
        const tabSplit = line4.split('\t');
        if (tabSplit.length > 1) {
            nat = tabSplit[1].replace(/€.*$/, '').trim();
        } else {
            // Tenta pegar nacionalidade após idade
            let natMatch = line4.match(/\)\s*([\p{L} ]+)/u);
            if (natMatch) nat = natMatch[1].trim();
        }
        if (!nat) nat = 'N/A';

        // Valor de mercado: pode estar na 4ª ou 5ª linha
        let value = 100_000;
        let valueLine = line4;
        if (/€/.test(line4)) {
            value = parseValue(line4);
        } else if (lines[4] && /€/.test(lines[4])) {
            value = parseValue(lines[4]);
        }

        return { name, pos, age, nat, value };
    }).filter(Boolean);
}

function parseTeamBlocks(raw) {
    const lines = raw.split('\n');
    const blocks = [];
    const headerRegex = /^\s*"?([a-z]{3}-[a-z0-9-]+)"?\s*,?\s*$/i;

    let currentTeamId = null;
    let currentLines = [];

    const flush = () => {
        if (!currentTeamId) return;
        const rawData = currentLines.join('\n').trim();
        if (rawData) {
            blocks.push({ teamId: currentTeamId, rawData });
        }
        currentLines = [];
    };

    for (const line of lines) {
        const header = line.match(headerRegex);
        if (header) {
            flush();
            currentTeamId = header[1].toLowerCase();
            continue;
        }

        currentLines.push(line);
    }

    flush();
    return blocks;
}

/**
 * ─────────────────────────────────────────────
 * 5. EXECUÇÃO PRINCIPAL
 * ─────────────────────────────────────────────
 */
function run() {
    const teamsPath   = '../src-tauri/resources/data/teams.json';
    const leaguesPath = '../src-tauri/resources/data/leagues.json';
    const playersPath = '../src-tauri/resources/data/players.json';

    // Carrega players DB cedo para prevenir colisao global de IDs.
    let playersDb = { Players: [] };
    if (fs.existsSync(playersPath)) {
        try {
            const content = fs.readFileSync(playersPath, 'utf8');
            if (content) playersDb = JSON.parse(content);
        } catch { playersDb = { Players: [] }; }
    }

    // Carrega DBs
    let teamsDb   = { Teams: [] };
    let leaguesDb = { Leagues: [] };
    if (fs.existsSync(teamsPath))   teamsDb   = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));
    if (fs.existsSync(leaguesPath)) leaguesDb = JSON.parse(fs.readFileSync(leaguesPath, 'utf8'));

    const teamBlocks = parseTeamBlocks(RAW_DATA);
    let imports = [];

    if (teamBlocks.length) {
        for (const block of teamBlocks) {
            const exists = teamsDb.Teams.some(t => t.Id === block.teamId);
            if (!exists) {
                console.log(`⚠️ TeamId ignorado (não encontrado): ${block.teamId}`);
                continue;
            }
            imports.push(block);
        }

        if (!imports.length) {
            return console.error('❌ Nenhum TeamId válido encontrado nos cabeçalhos do RAW_DATA.');
        }
    } else {
        const team = teamsDb.Teams.find(t => t.Id === CONFIG.teamId);
        if (!team) return console.error(`❌ Time "${CONFIG.teamId}" não encontrado no teams.json`);
        imports = [{ teamId: CONFIG.teamId, rawData: RAW_DATA }];
    }

    const targetTeamIds = new Set(imports.map(i => i.teamId));
    const usedIds = new Set(
        playersDb.Players
            .filter(p => !targetTeamIds.has(p.TeamId))
            .map(p => p.Id)
    );

    let totalImported = 0;

    for (const item of imports) {
        const team = teamsDb.Teams.find(t => t.Id === item.teamId);
        if (!team) continue;

        const league = leaguesDb.Leagues.find(l => l.TeamIds && l.TeamIds.includes(team.Id));
        const leagueTier = league ? (league.Tier || 1) : 1;
        const teamTier = team.Tier || 1;

        const parsed = parsePlayers(item.rawData);
        if (!parsed.length) {
            console.log(`⚠️ Nenhum atleta encontrado para ${item.teamId}.`);
            continue;
        }

        console.log(`\n📦 Importando ${item.teamId} (${parsed.length} atletas):`);

        const importedPlayers = parsed.map(({ name, pos, age, nat, value }) => {
            const baseId = `player-${slugify(name)}`;
            let playerId = baseId;
            let suffix = 2;
            while (usedIds.has(playerId)) {
                playerId = `${baseId}-${suffix}`;
                suffix += 1;
            }
            usedIds.add(playerId);

            let overall = 35;
            overall += Math.floor(Math.log10(value + 1) * 5);
            overall -= (leagueTier - 1) * 5;
            overall -= (teamTier - 1) * 3;

            if (age >= 32) {
                const anosAcima = age - 31;
                overall -= Math.floor(anosAcima * 1.1);
            }
            overall = Math.max(30, overall);
            overall = Math.min(overall, 80);

            const stamina = Math.max(30, 70 - Math.max(0, age - 26));
            const specs = specialties[pos] || ["Passing", "Dribbling", "Speed"];
            const stats = { Speed: overall, Shooting: overall, Passing: overall, Dribbling: overall, Defense: overall };

            stats[specs[0]] += 8;
            stats[specs[1]] += 4;
            stats[specs[2]] += 2;

            Object.keys(stats).forEach(s => {
                if (!specs.includes(s)) stats[s] -= 25;
                stats[s] = Math.max(10, Math.min(Math.round(stats[s]), 80));
            });

            console.log(`  ✔ ${name.padEnd(28)} ${pos.padEnd(4)} Idade:${age} Nac:${nat.padEnd(12)} €${formatarValor(value).padStart(15)}  Overall:${Math.round(overall)}`);

            return {
                Id: playerId,
                Name: name,
                TeamId: item.teamId,
                Position: pos,
                Age: age,
                Nationality: nat,
                MarketValue: value,
                Status: "Não Convocado",
                ...stats,
                Stamina: stamina,
                Overall: Math.round(overall)
            };
        });

        playersDb.Players = playersDb.Players.filter(p => p.TeamId !== item.teamId);
        playersDb.Players.push(...importedPlayers);
        totalImported += importedPlayers.length;
    }

    fs.writeFileSync(playersPath, JSON.stringify(playersDb, null, 2));
    console.log(`\n✅ Importação concluída: ${totalImported} atletas processados em ${imports.length} time(s).`);
}

run();
