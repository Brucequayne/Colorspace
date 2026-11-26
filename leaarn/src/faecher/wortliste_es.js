// ===== faecher/wortliste_es.js · Spanisch-Vokabeln: 2500 wichtige spanische Wörter (seit v0.20.3) =====
// Reihenfolge = Häufigkeit im Spanischen (Zeile 1 = häufigstes Wort; Grundlage: wordfreq-Häufigkeitsliste, Verben in der Grundform leicht aufgewertet).
// Aufbau wie faecher/wortliste.js (Englisch), gleiche Themen und Wortarten. Eine Zeile:  spanisch=deutsch=Thema=Wortart
//   spanisch: Synonyme mit ";" getrennt, Formen desselben Wortes mit "|" (männlich|weiblich, z. B. el amigo|la amiga – zählen als dasselbe Wort, kein Synonym-Bonus)
//             Nomen mit Artikel (el, la, los, las); der Artikel muss beim Antworten nicht mitgeschrieben werden
//   deutsch:  erlaubte Übersetzungen mit ";" (die erste wird bei Deutsch → Spanisch gezeigt), Nomen mit Artikel
//   Thema:    A Alltag & Zuhause · E Essen & Trinken · M Menschen & Familie · K Körper & Gesundheit · S Schule & Arbeit · N Natur & Tiere
//             R Stadt, Reisen & Verkehr · T Technik & Medien · P Politik & Gesellschaft · G Wirtschaft & Geld · F Freizeit, Sport & Kultur
//             Z Zeit & Zahlen · O Gefühle & Charakter · - ohne Thema (nur in „Alle Wörter“ und bei den Wortarten)
//   Wortart:  n Nomen · v Verb · a Adjektiv · d Adverb · x kleines Wort (Pronomen, Präposition, Konjunktion, Zahl …)
// Neue Wörter einfach unten anhängen (bitte keine Zeile umsortieren, die Schwierigkeit hängt an der Position).
export const RAW_ES = `
de;desde=von;aus=-=x
que;eso;aquel=dass;das;jener;was;als=-=x
el|la|los|las=der;die;das;er=-=x
en=in;an;bei=-=x
y=und=-=x
a;hacia=zu;nach=-=x
no;ningún|ninguno|ninguna=nicht;nein;kein=-=x
ella;la=sie;ihr=-=x
un|una=ein;eine=-=x
sobre;en;aproximadamente=auf;an;über;ungefähr=-=x
por=von;durch=-=x
con=mit=-=x
para;por=für=-=x
lo;le=ihn;ihm=-=x
ser;estar=sein=-=v
hay que=man muss=-=v
su=sein;seine;ihr;ihre=-=x
ellos|ellas;los|las=sie;ihnen=-=x
como=als;wie=-=x
me;mí=mich;mir=-=x
hacer;fabricar=tun;machen;herstellen=-=v
a través de;por;al otro lado de=durch;über;quer durch;gegenüber=-=x
más;si no=mehr;sonst;weiter;plus;zuzüglich=-=x
si=wenn;falls;ob;ja=-=x
pero;sino=aber;sondern=-=x
ver=sehen=-=v
o=oder;entweder=-=x
si no;de lo contrario=sonst;andernfalls=-=d
ello;lo=es=-=x
mi=mein;meine=-=x
tener;haber=haben=-=v
tú;vosotros;usted;vuestro|vuestra;su=du;ihr;Sie;dein;deine;euer;Ihr=-=x
decir=sagen=-=v
el este=der Osten=R=n
todo|toda|todos|todas=alle;alles;ganz=-=x
ya=schon;bereits=Z=d
yo=ich=-=x
poder;la fuerza;la energía=können;die Macht;die Kraft;der Strom=-=v
por todo|por toda;durante todo=überall in;während des ganzen=-=x
ya no=nicht mehr=-=d
ir=gehen;fahren=-=v
sin=ohne=-=x
muy;sumamente=sehr;hoch;äußerst=-=d
también=auch=-=d
todos;todo el mundo=jeder;alle=-=x
mirar;parecer;ver;el reloj=schauen;aussehen;gucken;anschauen;zuschauen;die Uhr=-=v
nos;nosotros=uns=-=x
porque=weil=-=x
así;entonces=so;also=-=x
dos=zwei=Z=x
bien;fino|fina;la multa=gut;fein;in Ordnung;die Geldstrafe=-=d
entre=zwischen;unter=-=x
desde=seit=Z=x
por eso;por lo tanto=deshalb;daher;deswegen=-=d
saber;conocer;probar;el sabor;el gusto=wissen;kennen;schmecken;der Geschmack=-=v
hasta;la caja=bis;die Kasse=Z=x
dar=geben=-=v
por qué=warum;wieso=-=x
esto;este|esta=dies;dieser;diese;dieses=-=x
ahora=jetzt;nun=Z=d
hablar;charlar;la charla=reden;sprechen;das Gespräch=-=v
la era;la época=die Ära;das Zeitalter=Z=n
una vez=einmal=Z=n
hace=vor=Z=x
nada=nichts=-=x
de nada=bitte;gern geschehen=-=x
trabajar;el trabajo=arbeiten;die Arbeit=S=v
solo;justo;solamente;único|única;soltero|soltera=nur;gerade;einzig;einzeln;ledig;allein=-=d
la parte=der Teil=-=n
más bien;bastante=eher;lieber;ziemlich=-=d
deber;tener que;la obligación=sollen;müssen;die Pflicht;schulden=-=v
algo;un tanto=etwas;ziemlich=-=x
contar;decir=erzählen;sagen;zählen=-=v
llegar=ankommen=R=v
estar de acuerdo=zustimmen;einverstanden sein=-=v
el tiempo;el clima=das Wetter=N=n
uno|una=eins;ein=Z=x
el día=der Tag=Z=n
salir;dejar;irse=verlassen;gehen;lassen=-=v
sobre todo;principalmente=meistens;hauptsächlich=-=d
caber;quedar bien;en forma=passen;fit=K=v
mucho|mucha;la cantidad;de sobra;fuertemente=viel;die Menge;reichlich;stark;schwer=-=x
la vida=das Leben=M=n
el mejor|la mejor;mejor=beste;bester;bestes;am besten;besser=-=n
tan=so=-=d
entero|entera;todo|toda=ganz;gesamt=-=a
pasar;ocurrir;suceder=passieren;geschehen=-=v
seguir=folgen=-=v
mismo|misma;igual=gleich;selbe;derselbe=-=a
siempre=immer=Z=d
ese|esa=dieser;diese;jener=-=x
dejar;renunciar=lassen;aufhören;kündigen=-=v
la gente;las personas;el pueblo=die Leute;die Menschen;das Volk=M=n
cada=jeder;jede;jedes=-=x
después=danach;später=Z=d
cuándo;cuando=wann;wenn;als=-=x
después de;tras=nach;nachdem=Z=x
el estado;el estatus=der Staat;der Zustand;der Status;der Stand=P=n
el mundo=die Welt=N=n
para siempre=für immer;ewig=Z=d
el año=das Jahr=Z=n
tomar;coger=nehmen=-=v
oriental;del este=östlich=R=a
otro|otra=andere;anderer;anderes;noch ein;ein anderer=-=a
pensar;creer=denken;glauben=-=v
gracias=danke=-=x
vivir=leben;wohnen=-=v
las cosas=das Zeug;die Sachen=A=n
ordenar;el tipo=sortieren;die Sorte;die Art=-=v
nunca;jamás=nie;niemals=Z=d
menos=weniger=-=x
poner;colocar=legen;stellen;setzen=-=v
antes;antes de=vor;bevor;vorher=Z=x
el poco;el trozo=das bisschen;das Stück=-=n
a menos que=außer wenn;es sei denn=-=x
encontrar;hallar=finden=-=v
el trabajo;el empleo;el puesto=der Job;die Arbeit;die Stelle=S=n
el lugar;el sitio;la ubicación=der Ort;der Platz;die Stelle;der Standort;die Lage=R=n
durante=während=Z=x
volver;regresar;devolver;la vuelta=zurückkehren;zurückgeben;die Rückkehr=-=v
encima de;sobre=über;oberhalb=-=x
el hecho=die Tatsache;der Fakt=-=n
contra=gegen=-=x
el país=das Land=P=n
el gobierno=die Regierung=P=n
aunque=obwohl=-=x
la cuenta;la factura;el billete=das Konto;die Rechnung;der Geldschein=G=n
nuevo|nueva=neu=-=a
estos|estas=diese=-=x
la casa;el hogar;en casa=das Zuhause;zu Hause;das Heim;das Haus=A=n
yo mismo|yo misma=mich selbst;ich selbst=-=x
aquí;acá=hier=-=d
leer=lesen=S=v
llevar;llevar puesto;cargar=tragen;anhaben=A=v
hoy=heute=Z=d
alguien;cualquiera=jemand;irgendjemand;jeder=-=x
usar;utilizar=benutzen;verwenden;nutzen=-=v
conocer;encontrarse;quedar=treffen;kennenlernen=-=v
tres=drei=Z=x
cambiar;el cambio;intercambiar;el intercambio=ändern;wechseln;die Änderung;tauschen;umtauschen;der Austausch=-=v
el caso=der Fall=-=n
el momento=der Moment;der Augenblick=Z=n
correctamente;bien=richtig;ordentlich=-=d
nuestro|nuestra=unser;unsere=-=x
bueno|buena=gut=-=a
la ciudad=die Stadt;die Großstadt=R=n
nacional=national=P=a
cuando sea;siempre que=wann immer;immer wenn=Z=x
quizás|quizá;tal vez=vielleicht=-=v
incluso;hasta=sogar;selbst=-=d
ganar;la ganancia=gewinnen;der Gewinn;verdienen=F=v
comer=essen=E=v
buscar;la búsqueda=suchen;die Suche=-=v
la verdad=die Wahrheit=-=n
pues=also;denn;nun=-=x
mientras=während=Z=x
la historia;el cuento=die Geschichte=F=n
entrar;introducir=eintreten;betreten;eingeben=-=v
nadie=niemand=-=x
muchos|muchas=viele=-=x
a veces=manchmal=Z=d
ayudar;la ayuda;asistir=helfen;die Hilfe;unterstützen=-=v
entonces;luego=dann;damals=Z=d
el tipo;el chico;la clase;amable;teclear=der Typ;der Kerl;die Art;die Sorte;freundlich;nett;tippen=M=n
jugar;tocar=spielen=F=v
discutir;hablar de;argumentar=besprechen;diskutieren;streiten;argumentieren=-=v
evitar=vermeiden=-=v
conseguir;obtener;recibir=bekommen;holen;kriegen=-=v
algunos|algunas;algo=einige;manche;etwas=-=x
tal=solch;solche=-=x
otra vez;de nuevo=wieder;nochmal=-=d
general=allgemein=-=a
mayor;superior=älter;leitend=-=a
mantener;guardar=behalten;halten;aufrechterhalten;warten;pflegen=-=v
esperar;la esperanza=hoffen;die Hoffnung;warten;erwarten=O=v
comprar;la compra=kaufen;der Kauf=G=v
crear=erschaffen;erstellen;schaffen=-=v
en general;total=insgesamt;gesamt=-=a
además=außerdem=-=x
según=laut;gemäß;je nach=-=x
empezar;comenzar;el comienzo=anfangen;beginnen;starten;der Start=-=v
perder=verlieren=-=v
entender;comprender=verstehen=-=v
cualquier|cualquiera=irgendein;beliebig=-=x
el nombre=der Name=M=n
el dios=der Gott=P=n
el acuerdo;la disposición=die Vereinbarung;die Zustimmung;die Anordnung=-=n
la manera;el modo;los modales=die Art;die Weise;die Manieren=-=n
amar;querer;el amor=lieben;die Liebe=O=v
creer=glauben=-=v
la ley;el derecho=das Gesetz;das Recht=P=n
medio|media;la mitad;el promedio;el centro=halb;die Hälfte;durchschnittlich;der Durchschnitt;die Mitte=Z=a
el partido;la cerilla=das Spiel;das Streichholz=F=n
tener éxito=gelingen;Erfolg haben=-=v
fuera;afuera=aus;hinaus;raus;draußen;weg;ab;außerhalb=-=x
pagar=bezahlen;zahlen=G=v
cualquier cosa;algo=irgendetwas=-=x
bajo|baja=niedrig;tief=-=a
hacia=in Richtung;auf zu=-=x
el hombre=der Mann;der Mensch=M=n
el grupo;la banda=die Gruppe;die Band=M=n
la mujer=die Frau=M=n
cerrar;cerca=schließen;nah;zumachen=-=v
alcanzar;llegar a=erreichen=-=v
el sistema=das System=T=n
la persona=die Person;der Mensch=M=n
escribir=schreiben=S=v
nosotros|nosotras=wir=-=x
el fin;el final;terminar=das Ende;beenden=-=n
la noche=die Nacht=Z=n
el presidente|la presidenta=der Präsident;die Präsidentin=P=n
casi=fast;beinahe=-=d
el pasado;pasado|pasada=die Vergangenheit;vergangen=Z=n
más bajo;bajar=niedriger;senken=-=a
dos veces=zweimal=Z=d
México=Mexiko=R=n
hasta luego=bis später;tschüss=-=x
continuar;seguir=weitermachen;fortsetzen=-=v
gastar;pasar=ausgeben;verbringen=G=v
aprobar;pasar=bestehen;vorbeigehen;genehmigen;billigen=-=v
dentro de=in;hinein;innerhalb=-=x
la cosa=das Ding;die Sache=-=n
la familia=die Familie=M=n
el lado=die Seite=-=n
sí mismo;él mismo=sich;sich selbst;er selbst;selbst=-=x
dentro=drinnen;innen;innerhalb=-=d
España=Spanien=R=n
en otro lugar;en otra parte=anderswo;woanders=-=d
aprender=lernen=S=v
parar;detener;dejar de=aufhören;anhalten;stoppen=-=v
el pueblo;la ciudad;la aldea=die Stadt;die Kleinstadt;das Dorf=R=n
escuchar=zuhören;hören=-=v
a un lado=beiseite=-=d
esos|esas;aquellos|aquellas=jene=-=x
el punto=der Punkt=-=n
el problema;los problemas=das Problem;der Ärger;die Schwierigkeiten=-=n
pedir;el pedido;el orden=bestellen;die Bestellung;die Reihenfolge=-=v
final;último|última;la final=letzte;endgültig;das Finale;das Ende;der Schluss=-=a
la política=die Politik;die Richtlinie=P=n
obtener;conseguir=erhalten;erlangen=-=v
al lado de=neben=-=x
el equipo;el equipamiento;la plantilla=die Mannschaft;das Team;die Ausrüstung;die Geräte;der Kader=F=n
el agua=das Wasser=N=n
la guerra=der Krieg=P=n
esta noche=heute Abend;heute Nacht=Z=d
sentir;sentirse=fühlen;sich fühlen=O=v
terminar;acabar=beenden;fertig machen=-=v
la condición;el estado=der Zustand;die Bedingung=-=n
realizar;dirigir;la conducta=durchführen;leiten;das Verhalten=-=v
sacar=herausnehmen;herausholen=-=v
la semana=die Woche=Z=n
importante;mayor=wichtig;bedeutend=-=a
la información=die Information;die Auskunft=T=n
la mañana=der Morgen;der Vormittag;morgen=Z=n
el favor;favorecer=der Gefallen;bevorzugen=-=n
ante=vor;angesichts=-=x
estar de pie=stehen=-=v
beber;tomar;la bebida=trinken;das Getränk=E=v
por favor=bitte=-=x
el dinero=das Geld=G=n
social=sozial;gesellschaftlich=P=a
claro|clara=klar;deutlich=-=a
el número=die Zahl;die Nummer=Z=n
el ejemplo=das Beispiel=S=n
dormir;el sueño=schlafen;der Schlaf=A=v
tratar;invitar=behandeln;einladen=-=v
igual=gleich;gleichberechtigt=-=a
el señor=Herr;der Herr;mein Herr=M=n
la hora=die Stunde=Z=n
la madre=die Mutter=M=n
mientras tanto=inzwischen;unterdessen=Z=d
llamar;golpear=anrufen;rufen;nennen;klopfen;stoßen=-=v
morir=sterben=-=v
mejorar;actualizar=verbessern;aufrüsten;das Upgrade=-=v
el centro=das Zentrum;die Mitte=R=n
la falta;faltar=der Mangel;fehlen=-=n
recibir=erhalten;bekommen;empfangen=-=v
excepto;salvo;menos=außer=-=x
apoyar;el apoyo=unterstützen;die Unterstützung=-=v
obligar;forzar;la fuerza=zwingen;die Kraft;die Gewalt=-=v
estudiar;el estudio=lernen;studieren;die Studie=S=v
tarde;la noche=spät;zu spät;der Abend;der Nachmittag=Z=a
la idea=die Idee=-=n
la muerte=der Tod=M=n
en cambio;en su lugar=stattdessen=-=d
venir=kommen=-=v
pequeño|pequeña;poco=klein;wenig=-=a
parecer=scheinen=-=v
en realidad;realmente=eigentlich;tatsächlich=-=d
la realidad=die Wirklichkeit;die Realität=-=n
anteriormente;antes=vorher;zuvor=Z=d
ligeramente;un poco=etwas;leicht=-=d
participar=teilnehmen=-=v
controlar;el control=kontrollieren;steuern;die Kontrolle=-=v
localizar;encontrar=finden;ausfindig machen=-=v
primero|primera=erste;erster;erstes;zuerst=Z=a
real;verdadero|verdadera=echt;wirklich;königlich;tatsächlich;eigentlich=-=a
sin embargo=jedoch;allerdings=-=d
el frente;delante=die Vorderseite;vorne=-=n
el tema;la cuestión=das Thema;die Frage=-=n
cuatro=vier=Z=x
más tarde;luego=später=Z=d
varios|varias;diversos|diversas=mehrere;verschiedene=-=x
el hijo=der Sohn=M=n
el desarrollo=die Entwicklung=-=n
la sociedad=die Gesellschaft=P=n
matar=töten=-=v
la mancha;el lugar;descubrir=der Fleck;die Stelle;entdecken=-=n
lograr;conseguir;alcanzar;dirigir;gestionar=erreichen;schaffen;leiten;verwalten=-=v
seguro|segura;cierto|cierta;la caja fuerte;asegurar=sicher;bestimmt;gewiss;der Tresor;die Versicherung;sichern=-=a
el nivel=die Ebene;das Niveau;das Level=-=n
compartir=teilen=-=v
en efecto;de hecho=tatsächlich;in der Tat=-=d
en cualquier lugar;en ninguna parte=irgendwo;überall=-=d
el juego;el partido=das Spiel=F=n
alguna vez;jamás=je;jemals=Z=d
la mano=die Hand=K=n
el proyecto=das Projekt=S=n
posible=möglich=-=a
el paso;el escalón;pisar=der Schritt;die Stufe;treten=-=n
planear;el plan=planen;der Plan=-=v
quién=wer=-=x
todavía;aún=noch;immer noch=-=d
grande=groß=-=a
la razón;el motivo=der Grund=-=n
cerca;cerca de;cercano|cercana=nah;in der Nähe von;in der Nähe;nahe gelegen=-=a
el artículo;el objeto=der Artikel;der Gegenstand=T=n
de cerca;estrechamente=genau;eng=-=d
abrir;abierto|abierta=öffnen;offen=-=v
el formulario;la forma;formar=das Formular;die Form;bilden=-=n
elegir;escoger=wählen;aussuchen=-=v
dividir;partir=teilen;spalten=-=v
el amigo|la amiga=der Freund;die Freundin=M=n
la tierra;aterrizar=das Land;landen;die Erde=N=n
el padre|la madre;los padres=der Elternteil;die Eltern;der Vater=M=n
la seguridad=die Sicherheit=P=n
la mayoría=die Mehrheit=P=n
único|única=einzigartig=-=a
recordar;acordarse=sich erinnern;sich merken;erinnern=-=v
responder;reaccionar;contestar;la respuesta=antworten;reagieren;die Antwort=-=v
querer=wollen=-=v
último|última;durar=letzte;letzter;letztes;dauern=Z=a
segundo|segunda;el segundo=zweite;zweiter;die Sekunde=Z=a
traer;llevar=bringen;mitbringen=-=v
el cuerpo=der Körper=K=n
la universidad=die Universität;die Uni;das College;die Hochschule=S=n
el programa=das Programm=T=n
más cerca=näher=-=a
el servicio=der Dienst;der Service=G=n
público|pública;el público=öffentlich;die Öffentlichkeit;das Publikum;die Zuschauer=P=a
la cabeza=der Kopf=K=n
internacional=international=P=a
la foto;la fotografía=das Foto=F=n
la situación=die Situation;die Lage=-=n
quedar;permanecer=bleiben;übrig bleiben=-=v
mil=tausend=Z=x
mundial;en todo el mundo=weltweit=-=a
el libro;reservar=das Buch;buchen=S=n
construir=bauen;konstruieren=-=v
la ayuda;la asistencia=die Hilfe;die Unterstützung=-=n
el proceso;procesar=der Prozess;der Vorgang;verarbeiten=-=n
los datos=die Daten=T=n
la educación=die Bildung;die Erziehung=S=n
el sentido;sentir=der Sinn;spüren=-=n
causar;la causa=verursachen;die Ursache=-=v
votar;el voto=wählen;abstimmen;die Stimme=P=v
caer;caerse;el otoño;la caída=fallen;der Herbst;der Sturz=-=v
el mes=der Monat=Z=n
la clase=die Klasse;der Unterricht=S=n
cinco=fünf=Z=x
tú mismo|tú misma=dich selbst;du selbst=-=x
viajar;el viaje=reisen;die Reise=R=v
subir;elevarse;el aumento=steigen;aufsteigen;der Anstieg=-=v
aceptar=annehmen;akzeptieren=-=v
sí misma;ella misma=sich;sich selbst;sie selbst=-=x
realmente;de verdad=wirklich=-=d
largo|larga=lang=-=a
la orden;el mando;ordenar=der Befehl;befehlen=-=n
alto|alta=hoch;groß=-=a
la lista=die Liste=-=n
total;el total=gesamt;die Summe=Z=a
personal=persönlich;das Personal;die Belegschaft=-=a
español|española;el español=spanisch;das Spanisch=S=a
doméstico|doméstica;nacional=häuslich;inländisch=-=a
junto a=neben;zusammen mit=-=x
luchar;pelear;la pelea;esforzarse;la lucha=kämpfen;der Kampf;streiten;sich abmühen=-=v
marcar;la marca;la nota=markieren;die Markierung;die Note=-=v
el camino;la manera;el modo=der Weg;die Art=-=n
la empresa;la compañía;firme=die Firma;das Unternehmen;fest=G=n
la zona;el área;la región=das Gebiet;der Bereich;die Gegend;die Zone=R=n
la salud=die Gesundheit=K=n
a lo largo de=entlang=-=x
especial=besonders;speziell=-=a
el sitio;la obra=der Ort;die Website;die Baustelle=-=n
la policía=die Polizei=P=n
la base=die Basis;der Stützpunkt;die Grundlage=-=n
la paz=der Frieden=P=n
hola=hallo=-=x
intentar;probar;el intento=versuchen;probieren;der Versuch=-=v
medir;la medida=messen;die Maßnahme=Z=v
presentar;introducir;entregar=vorstellen;einführen;einreichen;abgeben=-=v
resolver;solucionar=lösen=S=v
la línea;la cola=die Linie;die Zeile;die Schlange=-=n
la cara=das Gesicht=K=n
la calle=die Straße=R=n
explicar=erklären=S=v
en línea=online=T=a
allí;ahí;allá=dort;da=-=d
la escuela;el colegio=die Schule=S=n
julio=der Juli=Z=n
la atención=die Aufmerksamkeit=S=n
defender=verteidigen=-=v
en algún lugar;en alguna parte=irgendwo=-=d
libre;gratis;gratuito|gratuita=frei;kostenlos;gratis=-=a
la luz;ligero|ligera;claro|clara=das Licht;hell;leicht=-=n
la relación=die Beziehung;das Verhältnis=M=n
la población=die Bevölkerung=P=n
la capital;el capital;la mayúscula=die Hauptstadt;das Kapital;der Großbuchstabe=P=n
la suerte=das Glück=O=n
buenos días=guten Morgen;guten Tag=-=x
prevenir;impedir;evitar=verhindern=-=v
la pregunta=die Frage=S=n
bastante;suficiente=genug;ziemlich=-=x
la música=die Musik=F=n
fácil=leicht;einfach=-=a
debido a=wegen=-=a
fuerte;ruidoso|ruidosa=stark;laut=-=a
el rey=der König=P=n
la cultura=die Kultur=F=n
difícil=schwierig;schwer=-=a
el miedo;temer=die Angst;fürchten=O=n
de alguna manera=irgendwie=-=d
cortar;el corte=schneiden;der Schnitt=-=v
oficial;el funcionario|la funcionaria;el agente=offiziell;der Beamte;der Offizier;der Polizist=P=a
la fuerza=die Stärke;die Kraft=-=n
demasiado|demasiada=zu viel;zu=-=d
propio|propia=eigen;eigene=-=a
vender=verkaufen=G=v
generalmente;en general=im Allgemeinen;allgemein=-=d
actuar;el acto;realizar=handeln;die Tat;auftreten;aufführen;leisten=-=v
el sur=der Süden=R=n
la serie=die Serie;die Reihe=F=n
marzo=der März=Z=n
dejar caer;la gota=fallen lassen;der Tropfen=-=v
inglés|inglesa;el inglés=englisch;das Englisch=S=a
aumentar;el aumento=erhöhen;steigen;die Zunahme=-=v
establecer;fundar=gründen;feststellen;etablieren=-=v
peor=schlechter;schlimmer=-=a
malvado|malvada;el mal=böse;das Böse=-=a
echar de menos;extrañar;perder=vermissen;verpassen=O=v
culpar;la culpa=beschuldigen;die Schuld=-=v
mostrar;enseñar;el espectáculo;exhibir;la pantalla=zeigen;die Show;anzeigen;ausstellen;die Anzeige=-=v
la edad;la época=das Alter;das Zeitalter=M=n
el futuro;futuro|futura=die Zukunft;zukünftig=Z=n
tocar;el tacto=berühren;anfassen;die Berührung=-=v
a pesar de=trotz=-=x
la justicia=die Gerechtigkeit;die Justiz=P=n
el fin de semana=das Wochenende=Z=n
la libertad=die Freiheit=P=n
del sur;meridional=südlich=R=a
el asentamiento;el acuerdo=die Siedlung;die Einigung=-=n
pasado mañana=übermorgen=Z=d
la vista;la opinión=die Aussicht;die Ansicht;der Blick;die Sicht;der Anblick=-=n
el corazón=das Herz=K=n
la imagen;la foto;el cuadro=das Bild;das Foto=-=n
el norte=der Norden=R=n
político|política=politisch;der Politiker;die Politikerin=P=a
principal;primario|primaria=Haupt-;hauptsächlich;primär=-=a
la cantidad=die Menge;der Betrag=Z=n
la voz=die Stimme=K=n
octubre=der Oktober=Z=n
diciembre=der Dezember=Z=n
correr=rennen;laufen=F=v
girar;dar la vuelta=drehen;abbiegen;umdrehen=-=v
la fiesta;el partido=die Party;die Partei;die Feier=F=n
ambos|ambas=beide=-=x
la palabra=das Wort=S=n
actual;la corriente=aktuell;gegenwärtig;die Strömung=Z=a
del norte;septentrional=nördlich=R=a
el estudio=das Studio;das Atelier=F=n
el modo=der Modus=T=n
debajo de;bajo=unter=-=x
corto|corta;bajo|baja=kurz=-=a
disfrutar=genießen=O=v
reducir=reduzieren;verringern=-=v
proteger=schützen=-=v
encontrarse con;el encuentro=begegnen;die Begegnung=-=v
joven=jung=-=a
el campo;el tono;lanzar=das Feld;der Bereich;das Spielfeld;die Tonhöhe;werfen=N=n
abril=der April=Z=n
la región=die Region;die Gegend=R=n
internet=das Internet=T=n
más allá de=jenseits;über hinaus=-=x
la comunidad=die Gemeinschaft;die Gemeinde=P=n
la investigación;investigar=die Forschung;forschen;die Untersuchung;die Ermittlung=S=n
romper;la pausa;el descanso=brechen;die Pause;kaputt machen=-=v
la película=der Film=F=n
desarrollar=entwickeln=-=v
la esposa;la mujer=die Ehefrau;die Frau=M=n
junio=der Juni=Z=n
la dirección;la gestión=die Leitung;das Management;die Verwaltung;die Adresse;die Richtung=G=n
reconocer=erkennen;wiedererkennen=-=v
la república=die Republik=P=n
el tiempo libre=die Freizeit=F=n
odiar;el odio=hassen;der Hass=O=v
dónde;adónde=wo;wohin=-=x
el precio=der Preis=G=n
el mercado=der Markt=G=n
la respuesta;responder;contestar;la reacción=die Antwort;antworten;die Reaktion=S=n
seis=sechs=Z=x
el papel;el rol;el periódico=die Rolle;das Papier;die Zeitung=-=n
el consejo;el ayuntamiento;la propina;la punta=der Rat;der Stadtrat;der Tipp;das Trinkgeld;die Spitze;der Ratschlag=P=n
noviembre=der November=Z=n
simplemente=einfach;schlicht=-=d
el movimiento;la moción=die Bewegung;der Antrag=-=n
quedarse;permanecer=bleiben;übernachten=-=v
la comida;el alimento=das Essen;die Nahrung;das Lebensmittel;die Mahlzeit=E=n
la experiencia=die Erfahrung;das Erlebnis=-=n
la producción=die Produktion;die Herstellung=G=n
el jefe|la jefa=der Chef;die Chefin=-=n
agosto=der August=Z=n
el siglo=das Jahrhundert=Z=n
enero=der Januar=Z=n
la pena;el penalti=die Strafe;der Elfmeter=F=n
seguro de sí mismo|segura de sí misma;confiado|confiada=selbstbewusst;zuversichtlich=O=a
ustedes=Sie;ihr=-=x
convertirse en;hacerse;volverse=werden=-=v
enviar;mandar=senden;schicken=-=v
permitir;posibilitar;el permiso=erlauben;ermöglichen;die Genehmigung=-=v
caminar;andar;pasear=gehen;spazieren gehen;laufen=-=v
apretar;pulsar;la prensa=drücken;die Presse=T=v
demostrar;probar;mostrar=beweisen;zeigen;vorführen;demonstrieren=-=v
el propósito;el fin=der Zweck;die Absicht=-=n
generar=erzeugen=-=v
ofrecer;la oferta=anbieten;das Angebot=G=v
la oportunidad;la posibilidad=die Chance;die Gelegenheit;die Möglichkeit=-=n
el espacio=der Raum;der Platz;der Weltraum=-=n
producir;fabricar=herstellen;produzieren=G=v
la página=die Seite=S=n
común;habitual;la articulación=gemeinsam;üblich;häufig;das Gelenk=-=a
servir=dienen;servieren;bedienen=-=v
considerar=überlegen;betrachten;in Betracht ziehen=-=v
finalmente;por fin;al final=endlich;schließlich;letztendlich=-=d
la organización=die Organisation=P=n
la opinión=die Meinung=-=n
febrero=der Februar=Z=n
alimentar;dar de comer=füttern;ernähren=E=v
la economía=die Wirtschaft=G=n
vale=okay;in Ordnung=-=x
las noticias;la noticia=die Nachrichten;die Neuigkeit=T=n
el arte=die Kunst=F=n
la acción=die Handlung;die Aktion=-=n
vivo|viva=lebendig;am Leben=-=a
olvidar=vergessen=-=v
el valor=der Wert=-=n
septiembre|setiembre=der September=Z=n
la plaza;el cuadrado;cuadrado|cuadrada=der Platz;das Quadrat;quadratisch=R=n
asegurar;garantizar=sicherstellen;sorgen für=-=v
eliminar=beseitigen;ausschalten=-=v
visitar;la visita=besuchen;der Besuch=-=v
el resultado=das Ergebnis;das Resultat=-=n
la fecha;la cita=das Datum;die Verabredung=Z=n
feliz;contento|contenta=glücklich;froh=O=a
pronto=bald=Z=d
el director|la directora;principal=der Direktor;der Regisseur;der Leiter;der Schulleiter;Haupt-=S=n
la iglesia=die Kirche=P=n
la calidad=die Qualität=-=n
central=zentral=-=a
Europa=Europa=R=n
la duda;dudar=der Zweifel;bezweifeln=-=n
necesario|necesaria=notwendig;nötig=-=a
preguntar;pedir=fragen;bitten=-=v
salvar;ahorrar;guardar=retten;sparen;speichern=-=v
atacar;el ataque=angreifen;der Angriff=P=v
soñar;el sueño=träumen;der Traum=O=v
local=örtlich;lokal;hiesig=-=a
el hermano=der Bruder=M=n
el mar=das Meer;die See=N=n
el viaje;la excursión;el trayecto=die Reise;der Ausflug;die Fahrt=R=n
civil=bürgerlich;zivil;der Zivilist=P=a
cuidar;el cuidado=sich kümmern;die Pflege=-=v
desear;el deseo=wünschen;der Wunsch=O=v
llorar;gritar;el grito=weinen;schreien;der Schrei=O=v
alrededor=herum;um;ungefähr=-=x
el niño|la niña;el chico|la chica=das Kind=M=n
negro|negra=schwarz=-=a
el objetivo;la meta;el gol;apuntar=das Ziel;das Tor;zielen;objektiv=F=n
el interés=das Interesse=-=n
la carrera=das Rennen;die Karriere;die Laufbahn=F=n
confiar;la confianza;depender=vertrauen;das Vertrauen;sich verlassen=O=v
la red;la web=das Netzwerk;das Netz;das Web=T=n
el mensaje=die Nachricht;die Botschaft=T=n
el río=der Fluss=N=n
el ejército=die Armee;das Heer=P=n
popular=beliebt;populär=-=a
la campaña;el timbre=die Kampagne;der Wahlkampf;die Glocke;die Klingel=P=n
el principio;el comienzo=der Anfang;der Beginn;das Prinzip;der Grundsatz=Z=n
descubrir=entdecken=-=v
la provincia=die Provinz=P=n
blanco|blanca=weiß=-=a
la prueba;el examen;las pruebas=der Test;die Prüfung;der Beweis;die Beweise=S=n
la nota;notar;el curso;el grado=die Notiz;die Note;bemerken;die Klasse;die Stufe=S=n
especialmente=besonders=-=d
darse cuenta=erkennen;merken;begreifen=-=v
el sol=die Sonne=N=n
el conocimiento;el saber=das Wissen;die Kenntnis=S=n
ayer=gestern=Z=d
la tripulación;el equipo=die Besatzung;die Mannschaft=-=n
mil millones=die Milliarde=Z=n
el interior;interior=das Innere;innen;innere;inneres=-=n
la marcha;el equipo=der Gang;die Ausrüstung=R=n
el kit;el equipo=die Ausrüstung;der Bausatz=-=n
crecer;cultivar=wachsen;anbauen=N=v
decidir=entscheiden;beschließen=-=v
el éxito=der Erfolg=-=n
anterior;previo|previa=vorherig;früher=Z=a
justo|justa;la feria=fair;gerecht;die Messe;der Jahrmarkt=-=a
significativo|significativa;importante=bedeutend;erheblich=-=a
celebrar;festejar=feiern=F=v
en última instancia;al final=letztendlich=-=d
la medida;el alcance=das Ausmaß=-=n
arriba=hoch;nach oben;oben=-=x
lejos=weg;entfernt;weit;fern=-=d
el aire=die Luft=N=n
América=Amerika=R=n
militar;el ejército=militärisch;das Militär=P=a
la puerta;el portón=die Tür;das Tor;das Gate=A=n
el estilo=der Stil=-=n
el oro=das Gold=N=n
la diferencia=der Unterschied=-=n
adelante;hacia delante=vorwärts;nach vorne=-=d
el autor|la autora=der Autor;die Autorin=F=n
el par=das Paar=-=n
la plata;plateado|plateada=das Silber;silbern=N=n
la muestra=die Probe;das Muster=-=n
a diferencia de=anders als;im Gegensatz zu=-=x
determinar=bestimmen;feststellen=-=v
relacionar;contar=sich beziehen;erzählen=-=v
pocos|pocas=wenige=-=x
la canción=das Lied;der Song=F=n
el fondo;financiar;la parte de abajo=der Fonds;finanzieren;der Boden;das Unterteil;der Hintergrund=G=n
la hija=die Tochter=M=n
cruzar;la cruz=überqueren;das Kreuz=-=v
el fútbol=der Fußball=F=n
el color=die Farbe=F=n
el recuerdo;la memoria=die Erinnerung;das Gedächtnis;der Speicher=-=n
la defensa=die Verteidigung=P=n
promover;ascender;promocionar=fördern;befördern;werben=G=v
el puerto=der Hafen;der Anschluss=R=n
menor;pequeño|pequeña;júnior=gering;klein;jünger;Junior-=-=a
el ministerio=das Ministerium=P=n
contigo=mit dir=-=x
juntos|juntas=zusammen=-=d
la fuente=die Quelle=-=n
el ministro|la ministra=der Minister;die Ministerin=P=n
el acceso;acceder=der Zugang;der Zugriff;zugreifen=T=n
la comunicación=die Kommunikation;die Verständigung=T=n
en todas partes;por todas partes=überall=-=d
correcto|correcta;derecho|derecha;el derecho;corregir=richtig;rechts;das Recht;korrekt;korrigieren=-=a
la oficina=das Büro=S=n
publicar;liberar;soltar=veröffentlichen;freilassen=-=v
el banco;la orilla=die Bank;das Ufer=G=n
el departamento=die Abteilung=S=n
la actividad=die Aktivität;die Tätigkeit=F=n
bailar;el baile=tanzen;der Tanz=F=v
serio|seria;grave=ernst;ernsthaft;schwer=-=a
diez=zehn=Z=x
recto|recta;derecho=gerade;direkt;geradeaus=-=a
la construcción=der Bau;die Konstruktion=-=n
en serio;seriamente=ernsthaft;im Ernst=-=d
sufrir=leiden=-=v
el sector=der Sektor;der Bereich=G=n
superior=obere;oberer;oberes;überlegen;höher;der Vorgesetzte=-=a
por supuesto=natürlich;selbstverständlich=-=d
diseñar;el diseño=gestalten;entwerfen;das Design=-=v
implementar;llevar a cabo=umsetzen;durchführen=-=v
viejo|vieja;antiguo|antigua=alt=-=a
malo|mala=schlecht;schlimm=-=a
diferente;distinto|distinta=anders;verschieden;unterschiedlich=-=a
el modelo=das Modell;das Model=-=n
la energía=die Energie=T=n
natural=natürlich=N=a
la capacidad;la habilidad=die Fähigkeit;die Kapazität;das Fassungsvermögen=-=n
la radio=das Radio=T=n
la boca=der Mund=K=n
cantar=singen=F=v
robar;atracar=stehlen;ausrauben;berauben=P=v
manejar;el mango;la manija=handhaben;der Griff=-=v
el fuego;el incendio=das Feuer=-=n
cubrir;la portada;la tapa=bedecken;das Cover=-=v
la posición;el puesto=die Position;die Stellung=-=n
unirse;participar=beitreten;mitmachen=-=v
el título;el encabezado=der Titel;die Überschrift=-=n
sí mismos;ellos mismos=sich;sich selbst;sie selbst=-=x
diario|diaria=täglich=Z=a
existir=existieren;bestehen=-=v
la comisión=die Kommission;die Provision=P=n
la cámara=die Kamera=T=n
la administración=die Verwaltung;die Regierung=P=n
el domingo=der Sonntag=Z=n
soplar;el golpe=blasen;pusten;der Schlag=-=v
la costa=die Küste=N=n
la culpa;el defecto=die Schuld;der Fehler=-=n
la crisis=die Krise=P=n
abandonar=verlassen;aufgeben=-=v
importar;la importación=importieren;der Import=G=v
conmigo=mit mir=-=x
meter=hineinstecken;hineinlegen=-=v
la mamá=die Mama;die Mutti=M=n
la sangre=das Blut=K=n
actualmente=derzeit;zurzeit=Z=d
imaginar;imaginarse=sich vorstellen=-=v
la violencia=die Gewalt=P=n
cuál=welcher;welche;welches=-=x
probablemente=wahrscheinlich=-=d
rápido|rápida=schnell;rasch=-=a
levantar;subir;criar;el ascensor=heben;erhöhen;großziehen;der Aufzug=-=v
la carta;la letra=der Brief;der Buchstabe=S=n
China=China=R=n
la asignatura;el tema;el sujeto=das Fach;das Thema;das Subjekt=S=n
Brasil=Brasilien=R=n
la decisión=die Entscheidung=-=n
la unión;el sindicato=die Union;die Gewerkschaft=P=n
el contenido;contento|contenta=der Inhalt;zufrieden=-=n
Francia=Frankreich=R=n
la televisión;el televisor=das Fernsehen;der Fernseher=T=n
imposible=unmöglich=-=a
la entrada=der Eintrag;der Eintritt;der Eingang=-=n
la banda;la pandilla=die Bande;die Gang=P=n
aparecer=erscheinen;auftauchen=-=v
mencionar=erwähnen=-=v
exigir;la demanda=verlangen;fordern;die Nachfrage=G=v
detener;arrestar=verhaften;festnehmen=P=v
observar=beobachten=-=v
atrás;la espalda=zurück;der Rücken=-=d
abajo=runter;hinunter;nach unten;unten=-=x
capaz=fähig=-=a
el club=der Verein;der Club=F=n
el texto=der Text=T=n
siete=sieben=Z=x
normal=normal=-=a
el error;la equivocación=der Fehler=S=n
nosotros mismos|nosotras mismas=uns;uns selbst=-=x
escapar;huir;la huida=fliehen;entkommen;die Flucht=-=v
garantizar;la garantía=garantieren;die Garantie=G=v
investigar=untersuchen;ermitteln=-=v
funcionar=funktionieren=T=v
genial;estupendo|estupenda;grande;increíble=großartig;toll;groß;fantastisch=-=a
la chica;la niña=das Mädchen=M=n
la mente=der Verstand;der Geist=-=n
verdadero|verdadera;cierto|cierta=wahr;richtig=-=a
el efecto=die Wirkung;der Effekt=-=n
tirar;jalar=ziehen=-=v
la versión=die Version;die Fassung=-=n
el código=der Code=T=n
la isla=die Insel=N=n
el profesor|la profesora;el maestro|la maestra;el catedrático|la catedrática=der Lehrer;die Lehrerin;der Professor=S=n
el respeto;respetar=der Respekt;respektieren=O=n
cuyo|cuya;de quién=wessen;dessen;deren=-=x
el dolor=der Schmerz=K=n
el análisis=die Analyse=S=n
grandioso|grandiosa;grande=großartig;groß=-=a
totalmente=total;völlig=-=d
la presencia=die Anwesenheit;die Gegenwart=-=n
la ropa=die Kleidung;die Klamotten=A=n
organizar;ordenar;acordar=organisieren;arrangieren;vereinbaren;anordnen=-=v
la constitución=die Verfassung=P=n
apenas=kaum=-=d
recoger;elegir;escoger=pflücken;auswählen;abholen=-=v
cargar;cobrar;la carga=aufladen;berechnen;laden;die Ladung=-=v
seleccionar;elegir=auswählen=-=v
citar;la cita=zitieren;das Zitat;anführen=-=v
la industria=die Industrie;die Branche=G=n
el premio=der Preis;die Auszeichnung;der Gewinn=-=n
la unidad=die Einheit=-=n
loco|loca;enfadado|enfadada=verrückt;sauer=-=a
enseñar=unterrichten;lehren;beibringen=S=v
entregar;repartir=liefern;zustellen=G=v
rico|rica=reich=G=a
destruir=zerstören=-=v
el instituto=das Institut=S=n
el vino=der Wein=E=n
el cielo=der Himmel=N=n
el origen=die Herkunft;der Ursprung=-=n
el colega;el compañero|la compañera;el amigo=der Kumpel;der Partner;der Kollege;die Kollegin=M=n
la importancia=die Bedeutung;die Wichtigkeit=-=n
la formación=die Bildung;die Formation=-=n
el cine=das Kino=F=n
la propiedad=das Eigentum;die Immobilie;die Eigenschaft=G=n
original;el original=ursprünglich;original;das Original=-=a
pobre=arm=G=a
el peso=das Gewicht=K=n
interesante=interessant=-=a
el juicio;la prueba=der Prozess;der Versuch=P=n
el canal=der Kanal;der Sender=T=n
la victoria=der Sieg=F=n
cultural=kulturell=F=a
la revolución=die Revolution=P=n
incluir=einschließen;beinhalten=-=v
identificar;reconocer=identifizieren;erkennen=-=v
definitivo|definitiva;último|última=ultimativ;endgültig=-=a
el asunto;la aventura=die Angelegenheit;die Affäre=-=n
humano|humana;el ser humano=menschlich;der Mensch=M=a
el verano=der Sommer=Z=n
el pie=der Fuß=K=n
la tecnología=die Technik;die Technologie=T=n
el hospital=das Krankenhaus=K=n
completamente;totalmente;enteramente=völlig;vollständig;ganz=-=d
el alma=die Seele=O=n
la pista;la vía;seguir=die Spur;das Gleis;verfolgen=-=n
quitar;eliminar=entfernen=-=v
malgastar;desperdiciar;la basura;los residuos=verschwenden;der Abfall;der Müll=-=v
arreglar;reparar;fijar=reparieren;befestigen=A=v
próximo|próxima;siguiente=nächste;nächster;nächstes=-=a
el conjunto;poner=setzen;stellen;das Set=-=n
el negocio;la empresa=das Geschäft;das Unternehmen=G=n
el curso=der Kurs=S=n
el suelo;el piso;la planta=der Boden;der Fußboden;das Stockwerk=N=n
muerto|muerta=tot=-=a
la nación=die Nation;das Volk=P=n
profesional;el profesional=professionell;beruflich;der Profi=S=a
ocho=acht=Z=x
particular;especial=bestimmt;besondere=-=a
expresar=ausdrücken=-=v
el cuarto;el trimestre=das Viertel;das Quartal;vierte;vierter;viertes=Z=n
la fe;la confianza=der Glaube;das Vertrauen=P=n
preparar=vorbereiten;zubereiten=-=v
la posibilidad=die Möglichkeit=-=n
el género;el sexo=das Geschlecht=M=n
la democracia=die Demokratie=P=n
oír=hören=K=v
el edificio=das Gebäude=R=n
el teléfono;el móvil|el celular=das Telefon;das Handy=T=n
la señora;la dama=die Dame;Frau=M=n
la mesa;la tabla=der Tisch;die Tabelle=A=n
económico|económica=wirtschaftlich=G=a
la naturaleza=die Natur=N=n
el pago=die Zahlung;die Bezahlung=G=n
la protección=der Schutz=-=n
el transporte;transportar=der Transport;befördern;die Beförderung=R=n
la lengua=die Zunge=K=n
el informe;informar=der Bericht;berichten=-=n
la venta;las rebajas=der Verkauf;der Ausverkauf=G=n
detrás de=hinter=-=x
la pareja;el socio|la socia=das Paar;der Partner;die Partnerin=M=n
perfecto|perfecta=perfekt;vollkommen=-=a
el material=das Material;der Stoff=-=n
completo|completa;completar=vollständig;komplett;beenden=-=a
la página web;el sitio web=die Webseite;die Website=T=n
la asociación;la colaboración=der Verband;der Verein;die Partnerschaft=-=n
directamente=direkt;unmittelbar=-=d
la edición=die Ausgabe;die Auflage=-=n
el deseo;desear=der Wunsch;das Verlangen;wünschen=O=n
con cuidado;cuidadosamente=vorsichtig;sorgfältig=-=d
significar;querer decir=bedeuten;meinen=-=v
montar;el paseo;subir=reiten;fahren;die Fahrt;steigen;anbringen=R=v
la lección;la clase=die Unterrichtsstunde;die Lektion=S=n
escalar;subir;trepar=klettern;steigen=F=v
el vídeo|el video=das Video=T=n
el perro|la perra=der Hund=N=n
la reunión=das Treffen;die Besprechung;die Sitzung=S=n
legal=legal;rechtlich=P=a
la solución=die Lösung=S=n
el viernes=der Freitag=Z=n
la responsabilidad=die Verantwortung=-=n
la revista;el diario=die Zeitschrift;das Tagebuch;das Magazin=T=n
el territorio=das Gebiet;das Territorium=P=n
la propuesta=der Vorschlag=-=n
la confianza=das Selbstvertrauen;das Vertrauen=O=n
la creación=die Schöpfung;die Erschaffung=-=n
el hambre=der Hunger=E=n
conducir;manejar=fahren=R=v
verdaderamente;realmente=wirklich;wahrhaft=-=d
asistir=besuchen;teilnehmen=S=v
sobrevivir=überleben=-=v
repetir=wiederholen=S=v
desaparecer=verschwinden=-=v
grabar;el récord;el disco=aufnehmen;der Rekord;die Schallplatte=-=v
la ciencia=die Wissenschaft;die Naturwissenschaft=S=n
el riesgo;arriesgar=das Risiko;riskieren=-=n
la cama=das Bett=A=n
doble;duplicar=doppelt;verdoppeln=Z=a
la opción=die Möglichkeit;die Option=-=n
la marca=die Marke=G=n
la referencia=der Verweis;die Referenz=-=n
despertar;despertarse=aufwachen;wecken=A=v
la distancia=die Entfernung;die Distanz=R=n
la aplicación;la app=die App=T=n
invertir;dar marcha atrás=investieren;umkehren;rückwärts=G=v
la reforma;reformar=die Reform;reformieren=P=n
el reino=das Königreich=P=n
convertir=umwandeln;bekehren=-=v
el silencio=die Stille;das Schweigen=-=n
dirigir;guiar;liderar=führen;leiten=-=v
el miembro=das Mitglied=M=n
mover;moverse;mudarse=bewegen;umziehen=-=v
la carretera;el camino=die Straße=R=n
el comercio;comerciar=der Handel;handeln=G=n
el producto=das Produkt=G=n
médico|médica;el doctor|la doctora=medizinisch;ärztlich;der Arzt;die Ärztin;der Doktor=K=a
el esfuerzo=die Mühe;die Anstrengung=-=n
representar=vertreten;darstellen=-=v
el daño;dañar=der Schaden;beschädigen;schaden=-=n
llenar;rellenar=füllen=-=v
volar;la mosca=fliegen;die Fliege=R=v
la fundación;la base=die Stiftung;die Grundlage;das Fundament=-=n
definir=definieren;festlegen=-=v
la ruta;el camino=die Route;der Weg=R=n
el sendero;el camino;la pista;el rastro=der Pfad;der Weg;die Spur=R=n
la selección=die Auswahl=-=n
la salida=der Ausgang;die Abfahrt=R=n
establecerse;resolver=sich niederlassen;beilegen=-=v
el término;el trimestre=der Begriff;das Halbjahr=-=n
verde=grün=-=a
el contacto;contactar=der Kontakt;kontaktieren=-=n
el crecimiento=das Wachstum=G=n
la función=die Funktion=T=n
santo|santa;sagrado|sagrada=heilig;der Heilige=P=a
excelente;destacado|destacada=ausgezeichnet;hervorragend=-=a
la independencia=die Unabhängigkeit=P=n
los derechos humanos=die Menschenrechte=P=n
global;mundial=weltweit;global=-=a
ocupar=besetzen;beschäftigen=-=v
el tribunal;la pista=das Gericht;der Platz=P=n
el líder;el jefe|la jefa=der Anführer;der Leiter;der Führer=P=n
la hermana=die Schwester=M=n
el usuario|la usuaria=der Benutzer;der Nutzer=T=n
el rato=die Weile;der Moment=Z=n
comprobar;revisar;controlar=prüfen;überprüfen;kontrollieren=-=v
el chico;el niño=der Junge=M=n
el parque;aparcar=der Park;parken=R=n
la elección;las elecciones;la opción=die Wahl;die Auswahl=P=n
lanzar;tirar;arrojar;el lanzamiento;el reparto=werfen;starten;einführen;der Start;die Besetzung=F=v
perdón;lo siento=Entschuldigung;es tut mir leid=O=x
por ciento;el porcentaje=das Prozent=Z=n
comercial;el anuncio=kommerziell;der Werbespot=G=a
la conexión;la relación=die Verbindung;der Zusammenhang=T=n
triste=traurig=O=a
el honor;honrar=die Ehre;ehren=-=n
el barrio;el vecindario=die Nachbarschaft;das Viertel=R=n
la electricidad;la luz=der Strom;die Elektrizität=T=n
duro|dura;difícil=hart;schwer;schwierig;zäh=-=a
bonito|bonita;guapo|guapa;bastante=hübsch;ziemlich=-=a
rojo|roja=rot=-=a
similar;parecido|parecida=ähnlich=-=a
vencer;golpear;el ritmo=schlagen;besiegen;der Takt=-=v
el contrato=der Vertrag=G=n
solicitar;aplicar=sich bewerben;anwenden;beantragen=S=v
el medio ambiente;el entorno=die Umwelt;die Umgebung=N=n
el discurso;el habla=die Rede;die Sprache=P=n
negar=leugnen;bestreiten;verweigern=-=v
declarar=erklären;verkünden=-=v
el debate;debatir=die Debatte;debattieren=P=n
admitir=zugeben;einlassen=-=v
el hogar=der Haushalt=A=n
ojalá;con suerte=hoffentlich=-=d
azul=blau=-=a
el juez|la jueza;juzgar=der Richter;beurteilen=P=n
increíble;asombroso|asombrosa=erstaunlich;toll;unglaublich=O=a
el maestro;dominar=der Meister;beherrschen=-=n
la entrevista=das Interview;das Vorstellungsgespräch=T=n
ocurrir;suceder=vorkommen;geschehen;auftreten=-=v
ninguno|ninguna;tampoco=keiner;keine;keines;weder=-=x
contribuir;aportar=beitragen=-=v
el marco=der Rahmen=-=n
la expresión=der Ausdruck=S=n
extraño|extraña;raro|rara=seltsam;fremd=-=a
la carne=das Fleisch=E=n
competir=konkurrieren;antreten=F=v
la oposición=die Opposition;der Widerstand=P=n
el teatro=das Theater=F=n
mentir;la mentira;estar tumbado=lügen;die Lüge;liegen=-=v
lleno|llena=voll=-=a
la caja=die Kiste;die Schachtel;der Karton=A=n
la escena=die Szene;der Schauplatz=F=n
el pelo;el cabello=das Haar;die Haare=K=n
la sección=der Abschnitt;die Abteilung=-=n
el grado;el título=der Grad;der Abschluss=S=n
la presión=der Druck=-=n
la enfermedad=die Krankheit=K=n
la estructura=die Struktur;der Aufbau=-=n
la misión=die Mission;der Auftrag=-=n
el matrimonio;la boda=die Ehe;die Heirat=M=n
el peligro=die Gefahr=-=n
el empleo=die Beschäftigung;die Anstellung=S=n
el pan=das Brot=E=n
proporcionar;ofrecer=bereitstellen;liefern;bieten=-=v
añadir;agregar;sumar=hinzufügen;addieren=-=v
la estación;la temporada=die Jahreszeit;die Saison;die Staffel;der Bahnhof;die Station=Z=n
el evento;el acontecimiento=das Ereignis;die Veranstaltung=F=n
el carácter;el personaje=der Charakter;die Figur=-=n
la operación=die Operation;der Betrieb=K=n
la planta;plantar=die Pflanze;pflanzen;das Werk=N=n
francés|francesa;el francés=französisch;das Französisch=S=a
la batalla=die Schlacht;der Kampf=P=n
los ingresos=das Einkommen=G=n
la teoría=die Theorie=S=n
cocinar;el cocinero|la cocinera=kochen;der Koch=E=v
independiente=unabhängig=P=a
confirmar=bestätigen=-=v
Japón=Japan=R=n
el café=der Kaffee=E=n
el lunes=der Montag=Z=n
descargar=herunterladen=T=v
la novia=die Freundin=M=n
gritar;el grito=schreien;der Schrei;rufen=O=v
el período|el periodo;la época=der Zeitraum;die Periode=Z=n
el tamaño;la talla=die Größe=-=n
exactamente=genau=-=d
enorme=riesig;gewaltig=-=a
el hotel=das Hotel=R=n
directo|directa;dirigir=direkt;leiten=-=a
la piel=die Haut=K=n
Rusia=Russland=R=n
el concepto=das Konzept;der Begriff=-=n
responsable=verantwortlich=-=a
raro|rara;extraño|extraña=seltsam;komisch;merkwürdig;selten=-=a
el festival;la fiesta=das Festival;das Fest=F=n
adoptar=adoptieren;übernehmen=-=v
la visión;la vista=die Vision;das Sehvermögen=-=n
principalmente=hauptsächlich=-=d
el baño;el cuarto de baño;la bañera;el váter;el inodoro=das Badezimmer;das Bad;die Badewanne;die Toilette;das Klo=A=n
el ojo=das Auge=K=n
la velocidad=die Geschwindigkeit;das Tempo=R=n
la reina=die Königin=P=n
Alemania=Deutschland=R=n
el sábado=der Samstag;der Sonnabend=Z=n
apreciar;agradecer=schätzen;zu schätzen wissen=-=v
la luna=der Mond=N=n
la crítica=die Kritik=-=n
cometer;comprometerse=begehen;sich verpflichten=-=v
disminuir;reducir;la disminución=abnehmen;verringern;der Rückgang=-=v
a menudo;con frecuencia=oft=Z=d
el comentario;comentar=der Kommentar;kommentieren=T=n
debajo;abajo=unter;unterhalb=-=x
la generación=die Generation=M=n
el candidato|la candidata=der Kandidat;die Kandidatin=P=n
el presupuesto=das Budget;der Haushalt=G=n
querido|querida=lieb=O=a
la altura;la estatura=die Höhe;die Größe=Z=n
el alcalde|la alcaldesa=der Bürgermeister;die Bürgermeisterin=P=n
mezclar;la mezcla=mischen;die Mischung=-=v
hacer trampa;engañar=schummeln;betrügen=-=v
el jugador|la jugadora=der Spieler;die Spielerin=F=n
antiguo|antigua;anterior=ehemalig;früher;antik;uralt=-=a
el descanso;el resto;descansar=die Pause;der Rest;sich ausruhen=-=n
notar;darse cuenta;el aviso=bemerken;der Hinweis=-=v
el tratamiento=die Behandlung=K=n
rasgar;romper;la lágrima=reißen;die Träne;zerreißen=-=v
nueve=neun=Z=x
el abogado|la abogada=der Anwalt;die Anwältin=P=n
el objeto=der Gegenstand;das Objekt=-=n
contratar;alquilar=einstellen;mieten=G=v
el ejercicio;hacer ejercicio=die Übung;trainieren=S=n
el liderazgo;la dirección=die Führung=-=n
el correo=die Post=-=n
la publicación=die Veröffentlichung=T=n
el contexto=der Zusammenhang;der Kontext=-=n
la cita;el nombramiento=der Termin;die Ernennung=-=n
listo|lista;preparado|preparada;inteligente;elegante=bereit;fertig;klug;schlau;schick=-=a
describir=beschreiben=-=v
privado|privada=privat=-=a
el distrito;el barrio=der Bezirk;das Viertel=R=n
el secretario|la secretaria=der Sekretär;die Sekretärin=S=n
el calor;calentar=die Hitze;die Wärme;erhitzen=N=n
la piedra=der Stein=N=n
la cárcel;la prisión=das Gefängnis=P=n
digital=digital=T=a
la técnica=die Technik;das Verfahren=-=n
histórico|histórica=historisch;geschichtlich=S=a
familiar;conocido|conocida=vertraut;bekannt=-=a
el máximo;como máximo=das Maximum;höchstens=Z=n
la intención=die Absicht=-=n
casarse=heiraten=M=v
guiar;el guía|la guía=führen;der Führer;der Ratgeber=R=v
recuperarse;recuperar=sich erholen;wiedererlangen=K=v
la autoridad=die Behörde;die Autorität=P=n
delante;adelante=voraus;vorne=-=d
la influencia;influir=der Einfluss;beeinflussen=-=n
el aeropuerto=der Flughafen=R=n
el capitán|la capitana=der Kapitän;der Hauptmann=R=n
la cadena=die Kette=-=n
el almuerzo;la comida=das Mittagessen=E=n
la literatura=die Literatur=S=n
la vergüenza;la pena=die Scham;die Schande;schade=O=n
el centro comercial=das Einkaufszentrum=R=n
nacer=geboren werden=-=v
pintar;la pintura=malen;streichen;die Farbe=F=v
reservar;la reserva=reservieren;die Reserve=-=v
el coche;el carro;el auto=das Auto;der Wagen=R=n
la tienda;almacenar;ir de compras=das Geschäft;der Laden;lagern;einkaufen=G=n
el idioma;la lengua;el lenguaje=die Sprache=S=n
el documento;documentar=das Dokument;dokumentieren=T=n
el espíritu;el ánimo=der Geist;die Stimmung=O=n
la frontera=die Grenze=P=n
las vacaciones;el día festivo=der Urlaub;der Feiertag;die Ferien=F=n
el planeta=der Planet=N=n
la actitud=die Einstellung;die Haltung=O=n
la leche=die Milch=E=n
la existencia=die Existenz;das Dasein=-=n
la pobreza=die Armut=G=n
buenas noches=gute Nacht;guten Abend=-=x
cuánto|cuánta=wie viel=-=x
reunir;reunirse;recoger=sammeln;sich versammeln=-=v
corriente;normal;común=gewöhnlich;normal=-=a
la declaración=die Aussage;die Erklärung=-=n
el papá=der Papa;der Vati=M=n
la pantalla=der Bildschirm;die Leinwand=T=n
el perfil=das Profil=T=n
la tarea=die Aufgabe=S=n
la belleza=die Schönheit=-=n
el blog=der Blog=T=n
el mínimo;como mínimo=das Minimum;mindestens=Z=n
el león=der Löwe=N=n
las existencias;la acción;el almacén=der Vorrat;die Aktie;das Lager=G=n
quemar;arder=brennen;verbrennen=-=v
conservar;preservar=bewahren;konservieren=-=v
borrar;eliminar=löschen=T=v
satisfacer=zufriedenstellen;befriedigen=-=v
la voluntad=der Wille=-=n
temprano;pronto=früh=Z=a
la pérdida=der Verlust=-=n
el crédito;el reconocimiento=der Kredit;die Anerkennung=G=n
el gerente|la gerente;el director|la directora=der Manager;der Leiter;der Geschäftsführer=G=n
reír;reírse=lachen=O=v
el artista|la artista=der Künstler;die Künstlerin=F=n
el gas;la gasolina=das Gas;das Benzin=N=n
la playa=der Strand=N=n
la inversión=die Investition;die Geldanlage=G=n
la identidad=die Identität=-=n
la inteligencia=die Intelligenz;der Geheimdienst=-=n
de repente;de pronto=plötzlich=Z=d
la distribución=die Verteilung;der Vertrieb=G=n
grave;severo|severa=schwer;streng;heftig=-=a
la resistencia=der Widerstand=-=n
en breve;pronto=kurz;bald=Z=d
imprimir;la impresión=drucken;der Druck=T=v
mío|mía;la mina=meins;meiner;meine;das Bergwerk=-=x
el tren;entrenar=der Zug;trainieren=R=n
operar;manejar=bedienen;betreiben;operieren=-=v
el comité=der Ausschuss;das Komitee=P=n
el asesinato;asesinar=der Mord;ermorden=P=n
inmediatamente;enseguida=sofort;unverzüglich=Z=d
dulce=süß=E=a
la rosa=die Rose;rosa;pink=N=n
el puente=die Brücke=R=n
el aspecto;la apariencia=das Aussehen;das Auftreten;der Aspekt=-=n
el interruptor;cambiar=der Schalter;wechseln;umschalten=T=n
ignorar=ignorieren=-=v
la medicina;el medicamento=die Medizin;das Medikament=K=n
el conflicto=der Konflikt=P=n
la novela=der Roman=F=n
la cocina=die Küche=A=n
el jueves=der Donnerstag=Z=n
la consecuencia=die Folge;die Konsequenz=-=n
el permiso=die Erlaubnis=-=n
el reconocimiento=die Anerkennung;die Erkennung=-=n
la física=die Physik=S=n
el bebé=das Baby=M=n
India;la India=Indien=R=n
frío|fría;el resfriado=kalt;die Erkältung=N=a
claramente=eindeutig;deutlich;klar=-=d
la estrategia=die Strategie=-=n
la categoría=die Kategorie=-=n
el concurso=der Wettbewerb=F=n
el periodista|la periodista=der Journalist;die Journalistin=T=n
comparar=vergleichen=-=v
contener=enthalten=-=v
cerrar con llave;la cerradura=abschließen;das Schloss=A=v
sonreír;la sonrisa=lächeln;das Lächeln=O=v
ampliar;expandir=erweitern;ausdehnen=-=v
afectar=beeinflussen;betreffen=-=v
instalar=installieren;einbauen=T=v
atraer=anziehen=-=v
el minuto=die Minute=Z=n
el deporte=der Sport=F=n
la liga=die Liga=F=n
el secreto;secreto|secreta=das Geheimnis;geheim=-=n
la madera;el bosque=das Holz;der Wald=N=n
la biblioteca=die Bibliothek;die Bücherei=S=n
el escritor|la escritora=der Schriftsteller;der Autor=F=n
tradicional=traditionell=-=a
el avión;la aeronave=das Flugzeug=R=n
el accidente=der Unfall=R=n
la tendencia=der Trend=-=n
regional=regional=R=a
la bandera=die Flagge;die Fahne=P=n
la resolución;el propósito=die Auflösung;der Vorsatz;der Beschluss=-=n
aproximadamente=ungefähr;etwa=Z=d
la entrega;el reparto=die Lieferung;die Zustellung=G=n
la ocasión=der Anlass;die Gelegenheit=-=n
la iniciativa=die Initiative=-=n
necesitar=brauchen;benötigen=-=v
referirse=sich beziehen;verweisen=-=v
ciertamente;sin duda=sicherlich;bestimmt=-=d
definitivamente;sin duda=auf jeden Fall;definitiv=-=d
particularmente;especialmente=besonders=-=d
prohibir;la prohibición=verbieten;das Verbot=P=v
originalmente;al principio=ursprünglich=-=d
inicialmente;al principio=anfangs;zunächst=Z=d
el trato;el negocio=der Deal;das Geschäft=G=n
disponible=verfügbar;erhältlich=-=a
acercarse;el enfoque=sich nähern;der Ansatz=-=v
extranjero|extranjera=ausländisch;fremd=P=a
el crimen;el delito;la delincuencia=das Verbrechen;die Kriminalität=P=n
el impacto=die Auswirkung;der Aufprall=-=n
móvil=mobil=T=a
previo|previa;anterior=vorherig;früher=Z=a
la frase;la oración;la sentencia;la expresión=der Satz;das Urteil;der Ausdruck;die Redewendung=S=n
Italia=Italien=R=n
oler;el olor=riechen;der Geruch=K=v
la publicidad=die Werbung=G=n
en el extranjero;al extranjero=im Ausland;ins Ausland=R=d
cenar=zu Abend essen=E=v
la cima;arriba;el pico=oben;die Spitze;der Gipfel=-=n
la habitación;el cuarto;la sala=das Zimmer;der Raum=A=n
el regalo;el presente;el don=das Geschenk;die Gegenwart;die Gabe=-=n
el animal=das Tier=N=n
la conferencia=die Konferenz=S=n
rápidamente;rápido=schnell=-=d
saltar;el salto=springen;der Sprung=F=v
la división=die Teilung;die Abteilung=-=n
el cáncer=der Krebs=K=n
el ciudadano|la ciudadana=der Bürger;die Bürgerin=P=n
el enemigo|la enemiga=der Feind=P=n
indicar;señalar=hinweisen;anzeigen=-=v
la religión=die Religion=P=n
la plataforma;el andén=die Plattform;der Bahnsteig=T=n
aparte;separado|separada=auseinander;getrennt=-=d
el museo=das Museum=F=n
la deuda=die Schulden=G=n
técnico|técnica=technisch=T=a
tuyo|tuya;suyo|suya=deins;deiner;deine;Ihres=-=x
dorado|dorada;de oro=golden=-=a
el compromiso=das Engagement;die Verpflichtung=-=n
el cuento=das Märchen;die Erzählung=F=n
el foro=das Forum=T=n
moral;la moraleja=moralisch;die Moral=-=a
la frecuencia=die Häufigkeit;die Frequenz=-=n
el palacio=der Palast=-=n
el humor;el estado de ánimo=die Laune;die Stimmung=O=n
la llegada=die Ankunft=R=n
copiar;la copia=kopieren;die Kopie=T=v
la señal;el letrero;firmar=das Schild;das Zeichen;unterschreiben;das Signal=-=n
la estrella=der Stern;der Star=N=n
probable=wahrscheinlich=-=a
sencillo|sencilla;simple;la llanura=einfach;schlicht;die Ebene=-=a
el viento=der Wind=N=n
la Navidad=Weihnachten=F=n
la superficie=die Oberfläche=-=n
el guardia|la guardia;vigilar=der Wächter;bewachen=-=n
el cumpleaños=der Geburtstag=F=n
el capítulo=das Kapitel=S=n
la juventud=die Jugend=M=n
el valle=das Tal=N=n
la tradición;la costumbre=die Tradition;der Brauch=F=n
el martes=der Dienstag=Z=n
el universo=das Universum;das Weltall=N=n
breve=kurz=-=a
el metro;el contador=der Meter;der Zähler=Z=n
proponer=vorschlagen=-=v
conectar;unir=verbinden=T=v
inusual;poco común=ungewöhnlich=-=a
el sonido;el ruido;sonar=der Klang;das Geräusch;klingen=-=n
la tarjeta;la carta=die Karte=-=n
hermoso|hermosa;bello|bella;bonito|bonita=schön=-=a
el escenario;la etapa;la fase=die Bühne;die Phase;die Stufe=F=n
normalmente;generalmente=normalerweise;meistens=-=d
el arma;la pistola=die Waffe;die Pistole=P=n
la sorpresa;sorprender=die Überraschung;überraschen=O=n
el método=die Methode=S=n
la colección=die Sammlung=F=n
la sesión=die Sitzung=-=n
el invierno=der Winter=Z=n
la conversación=das Gespräch;die Unterhaltung=-=n
la moda=die Mode=A=n
el software=die Software=T=n
la oferta;pujar=das Gebot;bieten=G=n
seguramente=sicherlich;bestimmt=-=d
la igualdad=die Gleichheit;die Gleichberechtigung=P=n
la exposición=die Ausstellung=F=n
gustar=mögen=-=v
agradecer=danken=-=v
sostener;agarrar=halten=-=v
nombrar=ernennen=-=v
lavar;lavarse=waschen=A=v
explorar=erkunden;erforschen=-=v
afirmar;la afirmación;reclamar=behaupten;die Behauptung;beanspruchen=-=v
el cerebro=das Gehirn=K=n
preocuparse;la preocupación=sich sorgen;die Sorge=O=v
la bolsa;el bolso=die Tasche;die Tüte=A=n
la escala;la báscula=die Waage;der Maßstab;die Skala=-=n
la víctima=das Opfer=P=n
la discusión;el debate;el argumento=die Diskussion;die Besprechung;der Streit;das Argument=-=n
besar;el beso=küssen;der Kuss=O=v
el comportamiento;la conducta=das Verhalten=-=n
el clima=das Klima=N=n
terrible;horrible=schrecklich;furchtbar=O=a
exponer;revelar;exhibir=aussetzen;aufdecken;ausstellen=-=v
el montón;el ramo=der Haufen;der Strauß=-=n
la gracia=die Anmut;die Gnade=-=n
el impuesto=die Steuer=G=n
sentarse;estar sentado=sitzen;sich setzen=-=v
la agencia=die Agentur;die Behörde=G=n
el vuelo=der Flug=R=n
el mapa=die Karte;die Landkarte=R=n
la masa;la misa=die Masse;die Messe=-=n
el periódico=die Zeitung=T=n
industrial=industriell=G=a
el novio=der Freund=M=n
el miércoles=der Mittwoch=Z=n
el placer=das Vergnügen;die Freude=O=n
constante=ständig;konstant=-=a
el examen=die Prüfung;die Klausur=S=n
el alcance;la gama=die Reichweite;die Auswahl=-=n
el archivo;el expediente=die Datei;die Akte=T=n
el gato|la gata=die Katze=N=n
anual=jährlich=Z=a
el beneficio;la ganancia=der Gewinn;der Profit=G=n
la década=das Jahrzehnt=Z=n
famoso|famosa;la celebridad=berühmt;der Promi;die Berühmtheit=-=a
el príncipe=der Prinz=P=n
el cuello;la nuca=der Hals;der Nacken=K=n
el compañero de clase|la compañera de clase=der Mitschüler;die Mitschülerin=S=n
la dictadura=die Diktatur=P=n
suponer=annehmen;vermuten=-=v
disparar;rodar=schießen;drehen=-=v
cotidiano|cotidiana;diario|diaria=alltäglich;Alltags-=A=a
la tasa;valorar=die Rate;bewerten=-=n
el oeste=der Westen=R=n
el sentimiento;la sensación=das Gefühl=O=n
Inglaterra=England=R=n
el dueño|la dueña;el propietario|la propietaria=der Besitzer;der Eigentümer=G=n
el marido;el esposo=der Ehemann;der Mann=M=n
la lluvia;llover=der Regen;regnen=N=n
la vivienda=die Wohnung;das Wohnen=A=n
tranquilo|tranquila;silencioso|silenciosa;calmar=leise;ruhig;still;beruhigen=-=a
universal=universell;allgemein=-=a
la suma=die Summe=Z=n
la cola=der Schwanz=N=n
la abuela=die Großmutter;die Oma=M=n
la educación física=der Sportunterricht=S=n
empacar;hacer la maleta;el paquete=packen;einpacken;die Packung=R=v
occidental=westlich=R=a
el cliente|la clienta=der Kunde;die Kundin;der Mandant=G=n
absolutamente=absolut;völlig=-=d
el tráfico=der Verkehr=R=n
la descripción=die Beschreibung=-=n
el ángel=der Engel=-=n
el concierto=das Konzert=F=n
el motor=der Motor=R=n
cero=null=Z=x
cancelar;anular=absagen;stornieren=-=v
permanente=dauerhaft;ständig=-=a
la alegría=die Freude=O=n
la moneda=die Münze=G=n
acompañar=begleiten=-=v
la traducción=die Übersetzung=S=n
la amistad=die Freundschaft=M=n
el millón=die Million=Z=n
concentrarse;el enfoque=sich konzentrieren;der Fokus=-=v
la tele;la televisión;el televisor=der Fernseher;das Fernsehen=T=n
caliente;caluroso|calurosa=heiß=-=a
chino|china;el chino=chinesisch=-=a
el billete;la entrada;el boleto=die Fahrkarte;das Ticket;die Eintrittskarte=R=n
el volumen;el tomo=die Lautstärke;das Volumen;der Band=-=n
el parlamento=das Parlament=P=n
la licencia;el carné de conducir=die Lizenz;der Führerschein=-=n
rechazar;disminuir;el descenso=ablehnen;sinken;der Rückgang;zurückweisen=-=v
perseguir=jagen;verfolgen=-=v
perfectamente=perfekt;völlig=-=d
rescatar;el rescate=retten;die Rettung=-=v
surgir;aparecer=auftauchen;entstehen=-=v
el pecho;el cofre=die Brust;die Truhe=K=n
la filosofía=die Philosophie=S=n
el tío=der Onkel=M=n
anunciar=ankündigen;bekanntgeben=-=v
el árbol=der Baum=N=n
divertido|divertida;gracioso|graciosa=lustig;komisch=O=a
regular;normal=regelmäßig;normal=-=a
África=Afrika=R=n
el salón;el pasillo;la sala=die Halle;der Flur;der Saal=A=n
el límite;limitar=die Grenze;das Limit;begrenzen=-=n
el campeón|la campeona=der Meister;der Champion=F=n
complejo|compleja;complicado|complicada=komplex;kompliziert=-=a
la reacción=die Reaktion=-=n
el representante|la representante=der Vertreter;der Abgeordnete=P=n
pertenecer=gehören=-=v
la amenaza=die Drohung;die Bedrohung=-=n
útil;servicial=nützlich;hilfsbereit;hilfreich=-=a
la fotografía;fotografiar=das Foto;fotografieren;die Fotografie=F=n
registrar;inscribirse=registrieren;anmelden=-=v
examinar;revisar=untersuchen;prüfen=-=v
cazar;la caza=jagen;die Jagd=N=v
el castillo=die Burg;das Schloss=-=n
europeo|europea=europäisch=P=a
recientemente=kürzlich;neulich=Z=d
la primavera;el muelle;saltar=der Frühling;die Feder;springen=Z=n
el vestido;vestirse=das Kleid;sich anziehen=A=n
reemplazar;sustituir=ersetzen=-=v
el significado=die Bedeutung=S=n
el bosque=der Wald=N=n
el nacimiento=die Geburt=M=n
agarrar;coger=packen;schnappen=-=v
derrotar;la derrota=besiegen;die Niederlage=F=v
la fase=die Phase=-=n
ilegal=illegal;verboten=P=a
el ruido=der Lärm;das Geräusch=-=n
la sal=das Salz=E=n
el imperio=das Reich;das Imperium=P=n
ideal;el ideal=ideal;das Ideal=-=a
izquierdo|izquierda;a la izquierda=links=-=a
de todos modos;de todas formas=sowieso;jedenfalls;trotzdem;unabhängig davon=-=d
el enlace;la conexión;conectar=der Link;die Verbindung;verbinden=T=n
el entrenamiento;la formación=das Training;die Ausbildung=F=n
la máquina=die Maschine=T=n
el caballo=das Pferd=N=n
extender;difundir;propagarse;ampliar;prolongar=verbreiten;sich ausbreiten;verlängern;erweitern=-=v
el efectivo;el dinero en efectivo=das Bargeld=G=n
el jardín=der Garten=A=n
fácilmente=leicht;mühelos=-=d
la herramienta=das Werkzeug=A=n
la emergencia;la urgencia=der Notfall=K=n
la definición=die Definition=S=n
la perspectiva=die Perspektive;die Sichtweise=-=n
reparar;la reparación=reparieren;die Reparatur=A=v
la personalidad=die Persönlichkeit=O=n
enfrente;lo contrario=gegenüber;das Gegenteil=-=a
el alcohol=der Alkohol=E=n
concluir=schließen;folgern=-=v
molestar;fastidiar=ärgern;nerven;stören;belästigen=O=v
inmediato|inmediata=sofortig;unmittelbar=-=a
el desastre;la catástrofe=die Katastrophe=-=n
la felicidad=das Glück;die Freude=O=n
el paciente|la paciente;paciente=der Patient;geduldig=K=n
reciente=neu;jüngst=Z=a
positivo|positiva=positiv=-=a
alemán|alemana;el alemán=deutsch;das Deutsch=S=a
la montaña=der Berg=N=n
la finca;la propiedad=das Anwesen;der Besitz=G=n
mental=geistig;psychisch=K=a
la variedad=die Vielfalt;die Auswahl=-=n
la temperatura=die Temperatur=N=n
la alternativa;alternativo|alternativa=die Alternative;alternativ=-=n
invitar=einladen=-=v
amplio|amplia;ancho|ancha=breit;weit=-=a
decidido|decidida=entschlossen=-=a
charlar;chatear;la charla=plaudern;chatten;der Plausch=T=v
extremo|extrema=extrem=-=a
el tono=der Ton=-=n
el combate;combatir=der Kampf;bekämpfen=P=n
la arena=der Sand=N=n
musical;el musical=musikalisch;das Musical=F=a
el orgullo=der Stolz=O=n
atrapar;coger=fangen;erwischen=-=v
la ventana=das Fenster=A=n
ruso|rusa;el ruso=russisch=-=a
esconder;esconderse=verstecken;sich verstecken=-=v
el agente|la agente=der Agent;der Vertreter=-=n
activo|activa=aktiv=-=a
editar=bearbeiten=T=v
plano|plana;el piso=flach;die Wohnung=-=a
dispuesto|dispuesta=bereit;gewillt=-=a
obvio|obvia;evidente=offensichtlich=-=a
el estadio=das Stadion=F=n
rural=ländlich=R=a
la academia=die Akademie=S=n
la risa=das Lachen=O=n
levantarse=aufstehen=A=v
nacido|nacida=geboren=M=a
el bar;la barra=die Bar;die Stange;der Riegel=F=n
el brazo=der Arm=K=n
el detalle=die Einzelheit;das Detail=-=n
actualizar;la actualización=aktualisieren;das Update=T=v
el ganador|la ganadora=der Gewinner;der Sieger=F=n
fluir;el flujo=fließen;der Fluss=-=v
el actor|la actriz=der Schauspieler;die Schauspielerin=F=n
obviamente=offensichtlich=-=d
puro|pura=rein;pur=-=a
la marina;la armada=die Marine=P=n
electrónico|electrónica=elektronisch=T=a
absoluto|absoluta=absolut;völlig=-=a
la explicación=die Erklärung=S=n
el caballero=der Ritter=-=n
el barco;el buque;enviar;la barca=das Schiff;verschicken;das Boot=R=n
clásico|clásica;el clásico=klassisch;der Klassiker=-=a
la cerveza=das Bier=E=n
el cuadro;la pintura=das Gemälde;die Malerei=F=n
la bomba;bombear=die Bombe;die Pumpe;pumpen=P=n
el talento=das Talent;die Begabung=-=n
Asia=Asien=R=n
la torre=der Turm=R=n
variar=variieren;sich unterscheiden=-=v
el asalto;el ataque;atacar=der Angriff;angreifen=P=n
la atmósfera;el ambiente=die Atmosphäre;die Stimmung=-=n
golpear;pegar=schlagen;treffen=-=v
la regla;gobernar=die Regel;herrschen=-=n
la ventaja;el beneficio=der Vorteil;der Nutzen=-=n
profundo|profunda=tief=-=a
prometer;la promesa=versprechen;das Versprechen=-=v
dibujar=zeichnen=F=v
potencial;el potencial=möglich;potenziell;das Potenzial=-=a
físico|física=körperlich;physisch=K=a
depender=abhängen=-=v
el entorno;el ajuste=die Umgebung;die Einstellung=-=n
capturar;captar=fangen;erfassen;erobern=-=v
las compras=das Einkaufen;der Einkauf=G=n
la comparación=der Vergleich=-=n
la extensión;la ampliación;la prórroga=die Verlängerung;der Anbau=-=n
el aniversario=der Jahrestag=F=n
cien|ciento=hundert=Z=x
la pared;el muro=die Wand;die Mauer=A=n
la petición;la solicitud;pedir=die Anfrage;die Bitte;anfordern=-=n
el huevo=das Ei=E=n
la enseñanza=der Unterricht;das Lehren=S=n
Corea=Korea=R=n
el vecino|la vecina=der Nachbar;die Nachbarin=M=n
horrible;terrible=schrecklich;furchtbar=O=a
traducir=übersetzen=S=v
el paro=die Arbeitslosigkeit=G=n
el abrazo=die Umarmung=O=n
apagar=ausschalten;löschen=T=v
individual;el individuo=einzeln;individuell;der Einzelne=-=a
oscuro|oscura=dunkel=-=a
Australia=Australien=R=n
extra;adicional=extra;zusätzlich=-=a
el elemento=das Element;der Bestandteil=-=n
la encuesta;el sondeo=die Umfrage=-=n
la ingeniería=die Technik;der Maschinenbau=T=n
el progreso;el avance=der Fortschritt=-=n
liberal=liberal=P=a
el turno;desplazar=die Schicht;verschieben=S=n
franco|franca;sincero|sincera=offen;ehrlich=-=a
emplear;contratar=beschäftigen;einstellen=S=v
alquilar;el alquiler=mieten;die Miete=A=v
el torneo=das Turnier=F=n
vacío|vacía;vaciar=leer;leeren=-=a
exacto|exacta;preciso|precisa=genau;exakt=-=a
personalmente=persönlich=-=d
la princesa=die Prinzessin=P=n
la infancia;la niñez=die Kindheit=M=n
la infraestructura=die Infrastruktur=R=n
el abuelo=der Großvater;der Opa=M=n
llamarse=heißen=-=v
practicar;la práctica=üben;die Übung;die Praxis=S=n
la solicitud;la aplicación=die Bewerbung;der Antrag;die Anwendung=S=n
la tabla;la pizarra;la junta=das Brett;die Tafel;der Vorstand=-=n
el lago=der See=N=n
cerrado|cerrada=geschlossen;zu=-=a
criminal;el delincuente|la delincuente=kriminell;der Verbrecher=P=a
el ciclo;ir en bicicleta=der Kreislauf;Rad fahren=-=n
el hierro;planchar=das Eisen;bügeln=A=n
preparado|preparada;dispuesto|dispuesta=bereit;vorbereitet=-=a
el círculo=der Kreis=-=n
el científico|la científica=der Wissenschaftler;die Wissenschaftlerin;wissenschaftlich=S=n
el salario;el sueldo=der Lohn=G=n
falso|falsa;la falsificación=gefälscht;falsch;die Fälschung=-=a
coleccionar;recoger=sammeln;abholen=-=v
el formato=das Format=T=n
la riqueza=der Reichtum=G=n
la excepción=die Ausnahme=-=n
la aprobación=die Zustimmung;die Genehmigung=-=n
el porcentaje=der Prozentsatz;der Anteil=Z=n
la característica;la función;característico|característica=die Eigenschaft;das Merkmal;die Funktion;typisch=-=n
revelar=enthüllen;verraten=-=v
hacer clic;el clic=klicken;der Klick=T=v
la flor=die Blume=N=n
crítico|crítica=kritisch;der Kritiker=-=a
el fracaso;el fallo=das Versagen;der Misserfolg;der Ausfall=-=n
el dedo=der Finger=K=n
peligroso|peligrosa=gefährlich=-=a
veinte=zwanzig=Z=x
la fábrica=die Fabrik=G=n
el cantante|la cantante=der Sänger;die Sängerin=F=n
el gasto=die Ausgabe;die Kosten=G=n
la corona=die Krone=P=n
doce=zwölf=Z=x
el aceite;el petróleo=das Öl=N=n
relacionado|relacionada;emparentado|emparentada=verwandt;zusammenhängend=-=a
súper=super;toll=-=a
la gira;el recorrido=die Tour;die Rundfahrt;die Tournee=R=n
Canadá=Kanada=R=n
la esquina;el rincón=die Ecke=-=n
el azúcar=der Zucker=E=n
la raíz=die Wurzel=N=n
la introducción=die Einführung;die Einleitung=S=n
la columna=die Spalte;die Säule;die Kolumne=-=n
el audio;el sonido=der Ton=T=n
regalar=schenken=-=v
moderno|moderna=modern=-=a
el trabajador|la trabajadora=der Arbeiter;die Arbeiterin=S=n
el vehículo=das Fahrzeug=R=n
apostar;la apuesta=wetten;die Wette=-=v
el restaurante=das Restaurant=E=n
aparentemente;al parecer=anscheinend;offenbar=-=d
fabricar=herstellen=G=v
posiblemente=möglicherweise=-=d
la magia;mágico|mágica=die Magie;magisch;der Zauber=-=n
supremo|suprema=höchste;oberste=-=a
el drama=das Drama=F=n
relativamente=relativ;verhältnismäßig=-=d
culpable=schuldig=P=a
rezar=beten=-=v
el queso=der Käse=E=n
el mantenimiento=die Wartung;die Instandhaltung=-=n
el virus=das Virus=K=n
temporal;provisional=vorübergehend;befristet=Z=a
la taza;la copa=die Tasse;der Pokal;der Becher=A=n
tercero|tercera;el tercio=dritte;dritter;drittes;das Drittel=Z=a
el empleado|la empleada=der Angestellte;der Mitarbeiter=S=n
el factor=der Faktor=-=n
el metal=das Metall=N=n
el avance;avanzar=der Fortschritt;vorrücken=-=n
la tormenta=der Sturm;das Gewitter=N=n
interno|interna=intern;innere=-=a
la costumbre=der Brauch=-=n
la conclusión=der Schluss;die Schlussfolgerung=S=n
el templo=der Tempel=-=n
complicado|complicada=kompliziert=-=a
impresionante=beeindruckend=-=a
el polvo=der Staub=A=n
transferir;la transferencia=übertragen;überweisen;die Überweisung=G=v
el horario;planear=der Zeitplan;der Stundenplan;planen=S=n
el ingeniero|la ingeniera=der Ingenieur;die Ingenieurin=T=n
gigante;el gigante=riesig;der Riese=-=a
la silla=der Stuhl=A=n
la protesta;protestar=der Protest;protestieren=P=n
la mejora=die Verbesserung=-=n
el cable=das Kabel=T=n
el tronco;el registro=das Protokoll;der Baumstamm=T=n
el PC;el ordenador=der PC;der Computer=T=n
desconocido|desconocida;el extraño|la extraña=unbekannt;der Fremde=-=a
el extraterrestre;extraño|extraña=der Außerirdische;fremd=-=n
adiós=tschüss;auf Wiedersehen=-=x
la preocupación;afectar=die Sorge;betreffen=O=n
enfermo|enferma=krank=K=a
el héroe|la heroína=der Held;die Heldin=-=n
la cena=das Abendessen=E=n
brillante;luminoso|luminosa;genial=hell;leuchtend;brillant;glänzend=-=a
italiano|italiana;el italiano=italienisch=-=a
la batería;la pila=die Batterie;der Akku=T=n
quejarse=sich beschweren;klagen=-=v
el idiota|la idiota=der Idiot=-=n
el primo|la prima=der Cousin;die Cousine=M=n
fingir=so tun als ob=-=v
el sueldo;el salario=das Gehalt=G=n
la preparación=die Vorbereitung=-=n
treinta=dreißig=Z=x
el hielo=das Eis=N=n
la boda=die Hochzeit=M=n
el rango;clasificar=der Rang;einstufen=-=n
el testigo|la testigo=der Zeuge=P=n
el paquete=das Paket=-=n
la sombra=der Schatten=N=n
el espejo=der Spiegel=A=n
solar=Solar-;Sonnen-=T=a
restaurar=wiederherstellen=-=v
el símbolo=das Symbol=-=n
el chocolate=die Schokolade=E=n
el jurado=die Jury;die Geschworenen=P=n
la cirugía;la operación=die Operation;die Chirurgie=K=n
la patata;la papa=die Kartoffel=E=n
la cifra;la figura=die Zahl;die Figur=-=n
el episodio=die Folge;die Episode=F=n
el recurso=die Ressource;das Hilfsmittel=-=n
el patio;el jardín=der Hof;der Garten=A=n
el humo;fumar=der Rauch;rauchen=-=n
democrático|democrática=demokratisch=P=a
el dibujo=die Zeichnung=F=n
el piloto|la piloto=der Pilot;die Pilotin=R=n
urbano|urbana=städtisch=R=a
la leyenda=die Legende;die Sage=-=n
constantemente=ständig=-=d
oficialmente=offiziell=-=d
masivo|masiva;enorme=massiv;riesig=-=a
nadar=schwimmen=F=v
la reseña;la crítica;revisar=die Bewertung;die Kritik;überprüfen=-=n
el entrenador|la entrenadora;el autocar=der Trainer;der Reisebus=F=n
financiero|financiera=finanziell=G=a
favorito|favorita;preferido|preferida=Lieblings-;der Favorit=-=a
tonto|tonta;estúpido|estúpida;mudo|muda;engañar=dumm;blöd;stumm;der Narr;der Dummkopf;täuschen;albern=-=a
gordo|gorda;la grasa=fett;dick;das Fett=K=a
religioso|religiosa=religiös=P=a
japonés|japonesa;el japonés=japanisch=-=a
el apartamento;el piso=die Wohnung=A=n
adecuado|adecuada;correcto|correcta;apropiado|apropiada=richtig;ordentlich;angemessen;passend=-=a
caro|cara=teuer=G=a
la nieve;nevar=der Schnee;schneien=N=n
la aventura=das Abenteuer=F=n
la cobertura=die Berichterstattung;die Abdeckung=T=n
habitual;usual=üblich;gewöhnlich=-=a
la profundidad=die Tiefe=-=n
el arroz=der Reis=E=n
la evaluación=die Bewertung;die Einschätzung=S=n
la transición=der Übergang=-=n
once=elf=Z=x
desayunar=frühstücken=E=v
costar;el coste|el costo=kosten;die Kosten=G=v
la roca;la piedra;el rock=der Felsen;der Stein;der Rock=N=n
casado|casada=verheiratet=M=a
lento|lenta=langsam=-=a
interesado|interesada=interessiert=-=a
la competición;la competencia;el concurso=der Wettbewerb;die Konkurrenz=F=n
la habilidad;la destreza=die Fähigkeit;das Können=S=n
el palo;pegar=der Stock;kleben=-=n
el soldado|la soldado=der Soldat=P=n
el traje;quedar bien=der Anzug;passen;stehen=A=n
el experto|la experta=der Experte;die Expertin=-=n
el combustible=der Kraftstoff;der Brennstoff=R=n
débil=schwach=-=a
el pollo;la gallina=das Huhn;das Hähnchen=E=n
básicamente=im Grunde;eigentlich=-=d
el desayuno=das Frühstück=E=n
el instrumento=das Instrument=F=n
frecuentemente;a menudo=häufig;oft=Z=d
el fundador|la fundadora=der Gründer;die Gründerin=G=n
el ensayo;la redacción=der Aufsatz;der Essay=S=n
el reloj=die Uhr=A=n
preguntarse;la maravilla=sich fragen;das Wunder=-=v
la pelota;el balón=der Ball=F=n
el álbum=das Album=F=n
colgar=hängen;aufhängen=-=v
el abuso;abusar=der Missbrauch;missbrauchen=-=n
la multitud=die Menge;die Menschenmenge=M=n
nuclear=Atom-;nuklear=T=a
el plato;la placa=der Teller;das Schild;das Gericht=A=n
ambiental;medioambiental=Umwelt-;ökologisch=N=a
la rueda;el volante=das Rad;das Lenkrad=R=n
la dieta;la alimentación=die Ernährung;die Diät=E=n
la recuperación=die Erholung;die Genesung=K=n
la medalla=die Medaille=F=n
la ceremonia=die Zeremonie;die Feier=F=n
la fórmula=die Formel=S=n
el nieto|la nieta=der Enkel;die Enkelin=M=n
el rendimiento;la actuación=die Leistung;die Aufführung=F=n
femenino|femenina=weiblich=M=a
suministrar;abastecer;el suministro=liefern;versorgen;der Vorrat=G=v
ancho|ancha;amplio|amplia=breit;weit=-=a
el conductor|la conductora=der Fahrer;die Fahrerin=R=n
contento|contenta;alegre;satisfecho|satisfecha=froh;erfreut;zufrieden=O=a
el borde=der Rand;die Kante=-=n
el invitado|la invitada;el huésped=der Gast=F=n
el patrón;el dibujo=das Muster=-=n
consciente=bewusst=-=a
quinto|quinta=fünfte;fünfter;fünftes=Z=a
el editor|la editora;el redactor|la redactora=der Redakteur;der Herausgeber=T=n
educativo|educativa=pädagogisch;lehrreich=S=a
la hoja;la sábana=das Blatt;das Laken=A=n
típico|típica=typisch=-=a
equivalente=gleichwertig;entsprechend=-=a
necesariamente=unbedingt;notwendigerweise=-=d
curioso|curiosa=neugierig=O=a
feo|fea=hässlich=-=a
el desierto=die Wüste=N=n
valiente=mutig;tapfer=O=a
encender=einschalten;anzünden=T=v
equivocado|equivocada;incorrecto|incorrecta=falsch=-=a
el asiento=der Sitz;der Sitzplatz=-=n
poderoso|poderosa;potente=mächtig;stark=-=a
el equilibrio;el saldo=das Gleichgewicht;der Kontostand=-=n
ocupado|ocupada=beschäftigt;besetzt=-=a
arruinar;la ruina=ruinieren;die Ruine=-=v
el lector|la lectora=der Leser;die Leserin=F=n
la excusa;disculpar=die Entschuldigung;die Ausrede;entschuldigen=-=n
la capa=die Schicht=-=n
el asesino|la asesina=der Mörder;der Killer=P=n
la expansión=die Erweiterung;die Ausdehnung=-=n
el logro=die Leistung;die Errungenschaft=-=n
la tía=die Tante=M=n
la parada=die Haltestelle=R=n
bienvenido|bienvenida;dar la bienvenida=willkommen;begrüßen=-=a
la huelga;golpear=der Streik;schlagen;streiken=-=n
básico|básica=grundlegend;einfach=-=a
maravilloso|maravillosa=wunderbar;wundervoll=O=a
negativo|negativa=negativ=-=a
orgulloso|orgullosa=stolz=O=a
la botella=die Flasche=E=n
el campeonato=die Meisterschaft=F=n
fundar=gründen=-=v
la oración=das Gebet=-=n
la tira;desnudarse=der Streifen;ausziehen=-=n
la concha;la cáscara=die Muschel;die Schale=N=n
ridículo|ridícula=lächerlich=-=a
sugerir;proponer=vorschlagen=-=v
conceder;la beca=gewähren;das Stipendium=-=v
adicional=zusätzlich=-=a
el correo electrónico;el email=die E-Mail=T=n
amarillo|amarilla=gelb=-=a
apresurarse;la prisa=eilen;hetzen;die Eile=-=v
académico|académica=akademisch;wissenschaftlich=S=a
esencial;imprescindible=wesentlich;unverzichtbar=-=a
la emoción=das Gefühl;die Emotion=O=n
la depresión=die Depression;die Senke=K=n
el hilo=der Faden=A=n
retener;conservar=behalten=-=v
el avión a reacción;el chorro=der Jet;der Strahl=R=n
la galería=die Galerie=F=n
la espada=das Schwert=-=n
la actriz=die Schauspielerin=F=n
los deberes;la tarea=die Hausaufgaben;die Hausaufgabe=S=n
perderse=sich verlaufen;sich verirren=R=v
británico|británica=britisch=P=a
específico|específica;concreto|concreta=bestimmt;spezifisch;konkret=-=a
literalmente=buchstäblich;wörtlich=-=d
fijo|fija=fest;festgelegt=-=a
la combinación=die Kombination=-=n
el gráfico;la tabla=das Diagramm;die Tabelle;grafisch;die Grafik=-=n
la prioridad=die Priorität;der Vorrang=-=n
las matemáticas;las mates=die Mathematik;die Mathe=S=n
la posesión=der Besitz=-=n
gris=grau=-=a
exportar;la exportación=exportieren;der Export=G=v
formal=förmlich;formell=-=a
la moto=das Motorrad=R=n
la manifestación=die Demonstration=P=n
la trama;el terreno=die Handlung;das Grundstück=F=n
adivinar;suponer=raten;schätzen;vermuten=-=v
limpio|limpia;limpiar=sauber;putzen;reinigen=A=a
el aparato;el dispositivo=das Gerät=T=n
recomendar=empfehlen=-=v
el autobús=der Bus=R=n
el ala=der Flügel=N=n
el acero=der Stahl=N=n
el bolsillo=die Tasche;die Hosentasche=A=n
la bicicleta;la bici=das Fahrrad;das Rad=R=n
armado|armada=bewaffnet=P=a
la queja;la reclamación=die Beschwerde=-=n
la cinta=das Klebeband;das Band=-=n
el poema=das Gedicht=S=n
la sanidad;la atención sanitaria=die Gesundheitsversorgung=K=n
el uniforme=die Uniform=A=n
inocente=unschuldig=P=a
el taxi=das Taxi=R=n
la camiseta=das T-Shirt=A=n
el pop;estallar=der Pop;platzen=F=n
el chiste;la broma;bromear=der Witz;scherzen=O=n
cansado|cansada=müde=K=a
la fila;remar=die Reihe;rudern=-=n
específicamente=speziell;ausdrücklich=-=d
el misterio=das Rätsel;das Geheimnis=-=n
fumar;el tabaco=das Rauchen=K=n
herido|herida=verletzt=K=a
la nariz=die Nase=K=n
el amante|la amante=der Liebhaber=-=n
sensible=empfindlich;sensibel=O=a
el paisaje=die Landschaft=N=n
quince=fünfzehn=Z=x
la tristeza=die Traurigkeit=O=n
requerir;necesitar=erfordern;benötigen=-=v
rodar;el rollo;el panecillo=rollen;die Rolle;das Brötchen=-=v
roto|rota=kaputt;gebrochen=-=a
el choque;el accidente;estrellarse=der Unfall;der Absturz;abstürzen=R=n
la rama;la sucursal=der Ast;die Filiale;der Zweig=N=n
el té=der Tee=E=n
las finanzas;financiar=die Finanzen;finanzieren=G=n
amable;simpático|simpática=freundlich=O=a
el sufrimiento=das Leiden=-=n
cincuenta=fünfzig=Z=x
herir;doler;lastimar=verletzen;wehtun=K=v
el bloque;bloquear=der Block;blockieren=-=n
atar;la corbata;el empate=binden;die Krawatte;unentschieden=-=v
el campamento;acampar=das Lager;zelten=F=n
combinar=kombinieren;verbinden=-=v
la longitud;la duración=die Länge=Z=n
seco|seca;secar=trocken;trocknen=-=a
reflejar;reflexionar=widerspiegeln;nachdenken=-=v
naranja;la naranja=orange;die Orange=E=a
el ácido;ácido|ácida=die Säure;sauer=S=n
el sacerdote;el cura=der Priester;der Pfarrer=-=n
el toro=der Stier;der Bulle=N=n
el cristal=der Kristall=N=n
estable;el establo=stabil;der Stall=-=a
el anfitrión|la anfitriona;presentar=der Gastgeber;moderieren=F=n
el dólar=der Dollar=G=n
barato|barata=billig;günstig=G=a
animar;alentar;aclamar=ermutigen;jubeln;anfeuern=-=v
extremadamente;sumamente=äußerst;extrem=-=d
el océano=der Ozean=N=n
la regulación;la norma=die Vorschrift;die Regelung=P=n
el incidente=der Vorfall=-=n
lo más destacado;destacar=der Höhepunkt;hervorheben=-=n
mono|mona;lindo|linda=süß;niedlich=-=a
la dificultad=die Schwierigkeit=-=n
la guitarra=die Gitarre=F=n
la pasta=die Nudeln;die Pasta=E=n
almorzar=zu Mittag essen=E=v
simpático|simpática;bonito|bonita=nett;schön=-=a
la llave;la tecla=der Schlüssel;die Taste=A=n
limitado|limitada=begrenzt;beschränkt=-=a
el productor|la productora=der Produzent;der Hersteller=G=n
el adolescente|la adolescente=der Teenager;der Jugendliche=M=n
el circuito=der Stromkreis;die Rennstrecke=T=n
la catedral=die Kathedrale;der Dom=R=n
el calendario=der Kalender=Z=n
enamorado|enamorada=verliebt=O=a
negarse;rechazar=ablehnen;verweigern=-=v
la planificación=die Planung=-=n
la comprensión;el entendimiento=das Verständnis=-=n
la herida=die Wunde=K=n
la financiación=die Finanzierung;die Förderung=G=n
el pecado=die Sünde=-=n
el descubrimiento=die Entdeckung=-=n
visual=visuell=-=a
la selva=der Dschungel;der Urwald=N=n
divertirse=sich amüsieren;Spaß haben=F=v
el desafío;el reto;desafiar=die Herausforderung;herausfordern=-=n
el camión=der Lastwagen;der LKW=R=n
embarazada=schwanger=K=a
el rival;el adversario|la adversaria=der Gegner=F=n
el plástico=das Plastik;der Kunststoff=-=n
latino|latina;el latín=lateinisch;das Latein=S=a
la ansiedad=die Angst;die Sorge=O=n
la pizza=die Pizza=E=n
correos=die Post;das Postamt=R=n
cuarenta=vierzig=Z=x
el arroyo;la corriente=der Bach;der Strom=N=n
el anillo;sonar=der Ring;klingeln=-=n
el vidrio;el vaso;el cristal=das Glas=A=n
separado|separada;separar=getrennt;trennen=-=a
la pierna=das Bein=K=n
eficaz;efectivo|efectiva=wirksam;effektiv=-=a
sano|sana;saludable=gesund=K=a
la estadística=die Statistik=S=n
razonable=vernünftig;angemessen=-=a
el terrorista|la terrorista=der Terrorist=P=n
la terapia=die Therapie=K=n
la comedia=die Komödie=F=n
griego|griega;el griego=griechisch=-=a
el carbón=die Kohle=N=n
el sacrificio;sacrificar=das Opfer;opfern=-=n
la fiebre=das Fieber=K=n
el tenis=das Tennis=F=n
los pantalones=die Hose=A=n
coherente;constante=beständig;konsequent=-=a
el disparo;el tiro=der Schuss=-=n
el estándar;la norma=der Standard;die Norm=-=n
fresco|fresca;guay=cool;kühl;frisch=-=a
pesado|pesada=schwer=-=a
precioso|preciosa;encantador|encantadora=schön;reizend;herrlich=O=a
el núcleo=der Kern=-=n
sinceramente;honestamente=ehrlich gesagt;ehrlich=-=d
cómodo|cómoda=bequem;gemütlich=A=a
ciego|ciega=blind=K=a
la fantasía=die Fantasie=F=n
advertir;avisar=warnen=-=v
la inmigración=die Einwanderung=P=n
la reputación;la fama=der Ruf=-=n
nervioso|nerviosa=nervös=O=a
el diccionario=das Wörterbuch=S=n
la adición;la suma=die Ergänzung;die Addition=-=n
la ola;saludar con la mano=die Welle;winken=N=n
el asistente|la asistente=der Assistent;die Assistentin=S=n
relevante=relevant;wichtig=-=a
la grabación=die Aufnahme=T=n
la autopista;la carretera=die Autobahn;die Landstraße=R=n
empujar=drücken;schieben=-=v
el préstamo;prestar=der Kredit;das Darlehen;leihen=G=n
salvaje=wild=N=a
la fruta=das Obst;die Frucht=E=n
el botón=der Knopf;die Taste=T=n
emocional=emotional;gefühlvoll=O=a
la fuga;gotear=undicht sein;das Leck=-=n
el investigador|la investigadora=der Forscher;die Forscherin=S=n
el lobo=der Wolf=N=n
mensual=monatlich=Z=a
el descuento=der Rabatt=G=n
la receta=das Rezept=E=n
el helado=das Eis;das Speiseeis=E=n
abrazar=umarmen=-=v
el pez;el pescado;pescar=der Fisch;fischen=E=n
el estrés;subrayar=der Stress;betonen=O=n
la camisa=das Hemd=A=n
preocupado|preocupada=besorgt=O=a
la bahía=die Bucht=N=n
eléctrico|eléctrica=elektrisch=T=a
el hombro=die Schulter=K=n
la trampa;atrapar=die Falle;fangen=-=n
el servidor=der Server=T=n
atractivo|atractiva=attraktiv;anziehend=-=a
la vela=die Kerze;das Segel=A=n
cálido|cálida;caliente=warm=N=a
amenazar=drohen;bedrohen=-=v
la miel;cariño=der Honig;Schatz=E=n
el alumno|la alumna;el estudiante|la estudiante=der Schüler;der Student;die Schülerin=S=n
la diversión;divertido|divertida=der Spaß;lustig=F=n
el adulto|la adulta;adulto|adulta=der Erwachsene;erwachsen=M=n
el consumidor|la consumidora=der Verbraucher=G=n
la etiqueta;etiquetar=das Etikett;beschriften;markieren=-=n
el ascenso;la promoción=die Beförderung;die Werbung=G=n
romano|romana=römisch=S=a
fuertemente;firmemente=stark;nachdrücklich=-=d
la cartera=die Brieftasche;die Geldbörse=A=n
la geografía=die Erdkunde;die Geografie=S=n
el pasaporte=der Reisepass=R=n
conservador|conservadora=konservativ=P=a
el entretenimiento=die Unterhaltung=F=n
la cuerda=die Schnur;die Saite=-=n
la caridad;la organización benéfica=die Wohltätigkeit;die Hilfsorganisation=P=n
automáticamente=automatisch=T=d
el campus=der Campus;das Schulgelände=S=n
naturalmente=natürlich=-=d
aburrido|aburrida=langweilig=O=a
el horno=der Ofen;der Backofen=A=n
el piano=das Klavier=F=n
el hueso=der Knochen=K=n
la disputa;disputar=der Streit;bestreiten=-=n
interesar=interessieren=-=v
el ordenador;la computadora=der Computer;der Rechner=T=n
estimar;calcular;la estimación=schätzen;die Schätzung=Z=v
la manzana=der Apfel=E=n
el rayo=der Strahl=N=n
la piscina=das Schwimmbecken;der Pool=F=n
el truco;engañar=der Trick;austricksen=-=n
el vapor=der Dampf=N=n
el tubo=die Röhre;die Tube=R=n
violento|violenta=gewalttätig;heftig=P=a
la vaca=die Kuh=N=n
la cueva=die Höhle=N=n
sexto|sexta=sechste;sechster;sechstes=Z=a
el trozo;la pieza;el pedazo=das Stück=-=n
extenso|extensa;amplio|amplia=umfangreich=-=a
la creencia=der Glaube;die Überzeugung=-=n
el tigre=der Tiger=N=n
el contraste=der Kontrast;der Gegensatz=-=n
el escritorio=der Schreibtisch=S=n
la sed=der Durst=E=n
la escalera=die Treppe;die Leiter=A=n
acostarse=ins Bett gehen;sich hinlegen=A=v
la lesión;la herida=die Verletzung=K=n
el oso;soportar;aguantar=der Bär;ertragen=N=n
Gran Bretaña=Großbritannien=R=n
la contribución;la aportación=der Beitrag=-=n
el fantasma=der Geist;das Gespenst=-=n
delgado|delgada;fino|fina=dünn=-=a
el estómago;la barriga=der Magen;der Bauch=K=n
la sopa=die Suppe=E=n
el mediodía=der Mittag=Z=n
la harina=das Mehl=E=n
masculino|masculina=männlich=M=a
la minoría=die Minderheit=P=n
el aliento;la respiración=der Atem=K=n
el sombrero=der Hut=A=n
el ferrocarril=die Eisenbahn=R=n
el teclado=die Tastatur=T=n
el ladrón|la ladrona=der Dieb;die Diebin=P=n
asustar=erschrecken;Angst machen=O=v
la advertencia;el aviso=die Warnung=-=n
asignar=zuweisen;zuteilen=-=v
patear;dar una patada;la patada=treten;der Tritt=F=v
incapaz=unfähig;nicht in der Lage=-=a
el experimento=das Experiment;der Versuch=S=n
la ducha;ducharse=die Dusche;duschen=A=n
arrastrar=ziehen;schleppen=-=v
sucio|sucia=schmutzig;dreckig=A=a
la interacción=die Interaktion;die Wechselwirkung=-=n
el cuchillo=das Messer=E=n
sabio|sabia=weise;klug=-=a
el cerdo=das Schwein=N=n
el limón=die Zitrone=E=n
el sobrino|la sobrina=der Neffe;die Nichte=M=n
los abuelos=die Großeltern=M=n
la goma=der Radiergummi=S=n
el cruce=die Kreuzung=R=n
sorprendido|sorprendida=überrascht=O=a
fracasar;fallar;suspender=scheitern;versagen;durchfallen=-=v
honesto|honesta;sincero|sincera=ehrlich=O=a
el retraso;retrasar=die Verspätung;verzögern=R=n
la oreja;el oído=das Ohr=K=n
permitirse=sich leisten=G=v
exclusivo|exclusiva=exklusiv=-=a
el carbono=der Kohlenstoff=N=n
morder;el mordisco;la picadura=beißen;der Biss=-=v
el ángulo=der Winkel=S=n
práctico|práctica=praktisch=-=a
lamentar;arrepentirse;el arrepentimiento=bereuen;das Bedauern=O=v
la nube=die Wolke=N=n
la instrucción=die Anweisung;die Anleitung=S=n
secundario|secundaria=sekundär;weiterführend=-=a
el tomate=die Tomate=E=n
el pintor|la pintora=der Maler;die Malerin=S=n
la granja=der Bauernhof;die Farm=N=n
la tarifa;la cuota=die Gebühr=G=n
merecer=verdienen=-=v
el tanque;el depósito=der Tank;der Panzer=-=n
el monstruo=das Monster;das Ungeheuer=-=n
jurar;decir palabrotas=schwören;fluchen=-=v
el cinturón=der Gürtel=A=n
librarse;deshacerse=loswerden;befreien=-=v
el arquitecto|la arquitecta=der Architekt;die Architektin=S=n
el euro=der Euro=G=n
ochenta=achtzig=Z=x
despedirse=sich verabschieden=-=v
el tejado;el techo=das Dach=A=n
el sospechoso|la sospechosa;sospechar=der Verdächtige;vermuten=P=n
la recompensa;recompensar=die Belohnung;belohnen=-=n
el golf=das Golf=F=n
prometido|prometida;ocupado|ocupada=verlobt;beschäftigt=M=a
la orquesta=das Orchester=F=n
trece=dreizehn=Z=x
sesenta=sechzig=Z=x
el agujero=das Loch=-=n
inspirar=inspirieren;begeistern=-=v
tender a;soler=neigen;dazu neigen=-=v
el componente=das Bauteil;der Bestandteil=T=n
preferir=bevorzugen;lieber mögen=-=v
la infección=die Infektion=K=n
el robot=der Roboter=T=n
estrecho|estrecha=eng;schmal=-=a
la mochila=der Rucksack;der Schulranzen=S=n
avanzado|avanzada=fortgeschritten=-=a
fantástico|fantástica=fantastisch=O=a
la mascota=das Haustier=N=n
el prisionero|la prisionera;el preso|la presa=der Gefangene=P=n
el baloncesto=der Basketball=F=n
el hábito;la costumbre=die Gewohnheit=-=n
externo|externa=extern;äußere=-=a
la recomendación=die Empfehlung=-=n
encantar=sehr gefallen;begeistern=O=v
el pastel;la tarta=der Kuchen=E=n
semanal=wöchentlich=Z=a
olímpico|olímpica=olympisch=F=a
la secuencia=die Abfolge;die Reihenfolge=-=n
reclutar=anwerben;rekrutieren=-=v
las gafas=die Brille=A=n
el agua mineral=das Mineralwasser=E=n
repasar=wiederholen;durchgehen=S=v
el alambre;el cable=der Draht=T=n
exitoso|exitosa=erfolgreich=-=a
Irlanda=Irland=R=n
el voluntario|la voluntaria=der Freiwillige=-=n
el hueco;la brecha=die Lücke=-=n
el centro turístico=der Urlaubsort;der Ferienort=R=n
relajarse;relajar=sich entspannen;entspannen=F=v
romántico|romántica=romantisch=O=a
redondo|redonda;la ronda=rund;die Runde=-=a
el requisito=die Anforderung;die Voraussetzung=-=n
la rodilla=das Knie=K=n
el flash;el destello=der Blitz=-=n
contemporáneo|contemporánea=zeitgenössisch;modern=-=a
el anciano|la anciana=der alte Mann;die alte Frau=M=n
la biología=die Biologie=S=n
implicar;involucrar=beteiligen;beinhalten=-=v
el residente|la residente;el habitante|la habitante=der Bewohner;der Einwohner=R=n
la valoración;la calificación=die Bewertung=-=n
el diseñador|la diseñadora=der Designer;der Gestalter=-=n
el almacenamiento=die Lagerung;der Speicher=T=n
comprometerse;involucrar=sich beschäftigen;einbinden=-=v
el alivio=die Erleichterung=O=n
el bono;la prima=der Bonus=G=n
crudo|cruda=roh=E=a
regularmente=regelmäßig=Z=d
valioso|valiosa=wertvoll=G=a
el aliado|la aliada=der Verbündete=P=n
raramente;rara vez=selten=-=d
la hierba;el césped=das Gras;der Rasen=N=n
la contraseña=das Passwort=T=n
setenta=siebzig=Z=x
canadiense=kanadisch=-=a
el dragón=der Drache=-=n
la criatura=das Wesen;das Geschöpf=N=n
la máscara;la mascarilla=die Maske=-=n
el postre=der Nachtisch;das Dessert=E=n
la muñeca=das Handgelenk;die Puppe=K=n
desafortunadamente;por desgracia=leider=-=d
el medicamento;la droga=das Medikament;die Droge=K=n
sólido|sólida=fest;solide=-=a
marino|marina=Meeres-=N=a
el esclavo|la esclava=der Sklave=P=n
el monitor;vigilar=der Monitor;überwachen=T=n
aplastar=zerdrücken=-=v
la farmacia=die Apotheke=K=n
el jersey=der Pullover=A=n
el desorden;el lío=das Durcheinander;die Unordnung=A=n
asiático|asiática=asiatisch=-=a
la porción;la ración=die Portion;der Anteil=E=n
el visitante|la visitante=der Besucher;die Besucherin=R=n
emocionante=spannend;aufregend=O=a
el debut=das Debüt=F=n
la cebolla=die Zwiebel=E=n
el mecánico|la mecánica=der Mechaniker;die Mechanikerin=S=n
el gallo=der Hahn=N=n
catorce=vierzehn=Z=x
noventa=neunzig=Z=x
la colina=der Hügel=N=n
la docena=das Dutzend=Z=n
el dormitorio=das Schlafzimmer=A=n
grueso|gruesa;espeso|espesa=dick=-=a
la serpiente=die Schlange=N=n
delicioso|deliciosa=lecker;köstlich=E=a
el sofá=das Sofa=A=n
el pájaro;el ave=der Vogel=N=n
graduarse;el graduado|la graduada=den Abschluss machen;der Absolvent=S=v
estirar=dehnen;strecken=K=v
el béisbol=der Baseball=F=n
la comodidad;el consuelo;consolar=der Trost;der Komfort;trösten=O=n
el pato=die Ente=N=n
el aula=das Klassenzimmer=S=n
el volcán=der Vulkan=N=n
la afición=das Hobby;die Leidenschaft=F=n
marrón=braun=-=a
blando|blanda;suave=weich=-=a
la sugerencia=der Vorschlag=-=n
el armario;el gabinete=der Schrank;das Kabinett=A=n
impresionar=beeindrucken=-=v
séptimo|séptima=siebte;siebter;siebtes=Z=a
los celos=die Eifersucht=O=n
la circunstancia=der Umstand=-=n
creativo|creativa=kreativ=-=a
el empleador|la empleadora;el empresario|la empresaria=der Arbeitgeber=S=n
la gripe=die Grippe=K=n
las zapatillas=die Turnschuhe;die Hausschuhe=A=n
el abrigo=der Mantel=A=n
el procesamiento=die Verarbeitung=T=n
la chaqueta=die Jacke=A=n
el ajedrez=das Schach=F=n
equivocarse=sich irren=-=v
el fabricante=der Hersteller=G=n
la ensalada=der Salat=E=n
el conejo=das Kaninchen=N=n
la niebla=der Nebel=N=n
el supermercado=der Supermarkt=R=n
la libra=das Pfund=G=n
la semilla=der Samen=N=n
el juguete=das Spielzeug=F=n
el chip;la astilla=der Chip;der Splitter=T=n
la jubilación=der Ruhestand;die Rente=S=n
la araña=die Spinne=N=n
la alfombra=der Teppich=A=n
mentiroso|mentirosa=verlogen;der Lügner=O=a
la pimienta=der Pfeffer=E=n
la falda=der Rock=A=n
barrer=fegen=A=v
nativo|nativa;materno|materna=einheimisch;Mutter-=-=a
el trastorno;el desorden=die Störung;die Unordnung=K=n
el ratón=die Maus=N=n
el águila=der Adler=N=n
el rastro;la huella;rastrear=die Spur;verfolgen=-=n
el jabón=die Seife=A=n
la librería=die Buchhandlung=R=n
la medianoche=die Mitternacht=Z=n
décimo|décima=zehnte;zehnter;zehntes=Z=a
generoso|generosa=großzügig=O=a
el cajón=die Schublade=A=n
el borrador=der Entwurf;entwerfen=-=n
químico|química;el producto químico=chemisch;die Chemikalie=S=a
el pariente|la pariente;relativo|relativa=der Verwandte;relativ=M=n
despacio;lentamente=langsam=-=d
el gen=das Gen=N=n
la mantequilla=die Butter=E=n
el balcón=der Balkon=A=n
el vocabulario=der Wortschatz;die Vokabeln=S=n
suelto|suelta;flojo|floja=locker;lose=-=a
el jamón=der Schinken=E=n
el burro=der Esel=N=n
enfriar=abkühlen=-=v
el carril;el callejón=die Gasse;die Spur=R=n
dar un puñetazo;el puñetazo=schlagen;der Schlag=-=v
el diamante=der Diamant=N=n
la olla;la maceta=der Topf=A=n
el menú=die Speisekarte;das Menü=E=n
la cabra=die Ziege=N=n
celoso|celosa=eifersüchtig=O=a
la piña=die Ananas=E=n
rodear=umgeben=-=v
la foca;sellar;el sello=die Robbe;versiegeln;das Siegel=N=n
mojar=nass machen=-=v
la puntuación;el marcador;marcar=die Punktzahl;der Spielstand;punkten=F=n
el susto;el choque;impactar=der Schock;schockieren=O=n
el participante|la participante=der Teilnehmer=-=n
la cortina=der Vorhang=A=n
la tos=der Husten=K=n
la mariposa=der Schmetterling=N=n
octavo|octava=achte;achter;achtes=Z=a
educado|educada=höflich;gut erzogen=O=a
optimista=optimistisch=O=a
el diente=der Zahn=K=n
el pasajero|la pasajera=der Fahrgast;der Passagier=R=n
la expectativa=die Erwartung=-=n
el atleta|la atleta;el deportista|la deportista=der Sportler;der Athlet=F=n
confundido|confundida=verwirrt=O=a
amargo|amarga=bitter=E=a
el ajo=der Knoblauch=E=n
la toalla=das Handtuch=A=n
el elefante=der Elefant=N=n
el aficionado|la aficionada;el ventilador=der Fan;der Ventilator=F=n
emocionado|emocionada;entusiasmado|entusiasmada=aufgeregt;begeistert=O=a
el clavo;la uña=der Nagel=A=n
el lápiz=der Bleistift=S=n
el cuaderno=das Heft=S=n
la gramática=die Grammatik=S=n
el músculo=der Muskel=K=n
detallado|detallada=ausführlich;detailliert=-=a
la uva=die Traube;die Weintraube=E=n
el codo=der Ellbogen=K=n
todo recto=geradeaus=R=d
la carpeta=der Ordner;die Mappe=T=n
la hamburguesa=der Hamburger=E=n
los guantes=die Handschuhe=A=n
sacudir;agitar;temblar=schütteln;zittern=-=v
australiano|australiana=australisch=-=a
Escocia=Schottland=R=n
ofensivo|ofensiva;la ofensiva=beleidigend;die Offensive=-=a
el pulmón=die Lunge=K=n
la tortuga=die Schildkröte=N=n
el arco iris=der Regenbogen=N=n
la maleta=der Koffer=R=n
múltiple=mehrere;mehrfach=-=a
envolver=einwickeln;einpacken=-=v
la natación=das Schwimmen=F=n
la lámpara=die Lampe=A=n
la célula;la celda=die Zelle=N=n
la gorra;la tapa=die Mütze;die Kappe;der Deckel=A=n
la nata;la crema=die Sahne;die Creme=E=n
la melodía;afinar=die Melodie;stimmen=F=n
el luchador|la luchadora=der Kämpfer=-=n
coreano|coreana;el coreano=koreanisch=-=a
el turista|la turista=der Tourist;die Touristin=R=n
el paraguas=der Regenschirm=A=n
el tiburón=der Hai=N=n
la proteína=das Eiweiß;das Protein=E=n
el cómic;cómico|cómica=der Comic;komisch=F=n
la manta=die Decke=A=n
el zapato=der Schuh=A=n
el veterano|la veterana=der Veteran=P=n
el videojuego=das Videospiel=T=n
egoísta=egoistisch=O=a
aleatorio|aleatoria;al azar=zufällig=-=a
competitivo|competitiva=wettbewerbsfähig;ehrgeizig=-=a
mojado|mojada=nass=N=a
la almohada=das Kissen;das Kopfkissen=A=n
el disfraz=die Verkleidung;das Kostüm=F=n
dieciocho=achtzehn=Z=x
el cacao=der Kakao=E=n
cavar=graben=-=v
el recreo=die Pause;die große Pause=S=n
los auriculares=die Kopfhörer=T=n
disgustado|disgustada;molesto|molesta=verärgert;aufgebracht;durcheinander=O=a
el inmigrante|la inmigrante=der Einwanderer=P=n
hundirse;el fregadero;el lavabo=sinken;das Waschbecken=A=v
el síntoma=das Symptom=K=n
la rana=der Frosch=N=n
el cubo de basura=der Mülleimer=A=n
deletrear;el hechizo=buchstabieren;der Zauber=S=v
el reportero|la reportera=der Reporter;die Reporterin=T=n
el cazador|la cazadora=der Jäger=N=n
el zumo;el jugo=der Saft=E=n
picante=scharf;würzig=E=a
el cargador=das Ladegerät=T=n
el cohete=die Rakete=T=n
dieciséis=sechzehn=Z=x
asustado|asustada=ängstlich=O=a
el zorro=der Fuchs=N=n
clínico|clínica=klinisch=K=a
noveno|novena=neunte;neunter;neuntes=Z=a
el garaje=die Garage=A=n
el llamamiento;atraer;la apelación=der Appell;ansprechen;die Berufung=-=n
la chimenea=der Kamin=A=n
mixto|mixta;mezclado|mezclada=gemischt=-=a
el labio=die Lippe=K=n
el clip;la pinza=der Clip;die Klammer=-=n
freír=braten;frittieren=E=v
la calefacción=die Heizung=A=n
el dentista|la dentista=der Zahnarzt;die Zahnärztin=S=n
la cuchara=der Löffel=E=n
el pavo=der Truthahn;die Pute=E=n
la oveja=das Schaf=N=n
el sótano=der Keller=A=n
el caracol=die Schnecke=N=n
afortunado|afortunada=glücklich=O=a
irlandés|irlandesa=irisch=-=a
la inundación=die Flut;die Überschwemmung=N=n
silencioso|silenciosa;callado|callada=still;leise;stumm=-=a
el plátano;la banana=die Banane=E=n
probarse=anprobieren=A=v
la milla=die Meile=Z=n
la cadera=die Hüfte=K=n
el desarrollador|la desarrolladora=der Entwickler=T=n
salado|salada=salzig=E=a
elogiar;alabar;el elogio=loben;das Lob=-=v
la nevera=der Kühlschrank=A=n
la pastilla=die Tablette=K=n
enfadado|enfadada;enojado|enojada=wütend;verärgert=O=a
el seguidor|la seguidora;el partidario|la partidaria=der Anhänger;der Unterstützer=F=n
el veterinario|la veterinaria=der Tierarzt;die Tierärztin=S=n
la pera=die Birne=E=n
el vinagre=der Essig=E=n
la tortilla=das Omelett;die Tortilla=E=n
diecisiete=siebzehn=Z=x
el caramelo=das Bonbon=E=n
el tobillo=der Knöchel=K=n
fregar=spülen;abwaschen=A=v
esquiar=Ski fahren=F=v
la impresora=der Drucker=T=n
el camarero|la camarera=der Kellner;die Kellnerin=E=n
el suegro|la suegra=der Schwiegervater;die Schwiegermutter=M=n
la ballena=der Wal=N=n
el mostrador;el contador=der Schalter;die Theke;der Zähler=-=n
la fresa=die Erdbeere=E=n
el refresco=das Erfrischungsgetränk;die Limonade=E=n
la panadería=die Bäckerei=R=n
típicamente=typischerweise=-=d
la bota;el maletero=der Stiefel;der Kofferraum=A=n
el gancho=der Haken=-=n
el tenedor=die Gabel=E=n
el cepillo=die Bürste=A=n
nublado|nublada=bewölkt=N=a
el semáforo=die Ampel=R=n
el gusano=der Wurm=N=n
hornear=backen=E=v
tímido|tímida=schüchtern=O=a
el loro=der Papagei=N=n
las patatas fritas=die Pommes;die Chips=E=n
la mermelada=die Marmelade=E=n
el aparcamiento=der Parkplatz=R=n
consistir=bestehen=-=v
el bolígrafo;la pluma=der Stift;der Kugelschreiber=S=n
los calcetines=die Socken=A=n
la grieta=der Riss=-=n
el orador|la oradora;el altavoz=der Sprecher;der Redner;der Lautsprecher=-=n
deslizarse;el tobogán;la diapositiva=rutschen;die Rutsche;die Folie=-=v
la lechuga=der Salat;der Kopfsalat=E=n
el delfín=der Delfin=N=n
cuidadoso|cuidadosa;prudente=vorsichtig;sorgfältig=-=a
vasto|vasta;inmenso|inmensa=riesig;gewaltig=-=a
el trueno=der Donner=N=n
la tonelada=die Tonne=Z=n
el agricultor|la agricultora;el granjero|la granjera=der Bauer;der Landwirt=N=n
apretado|apretada;ajustado|ajustada=eng;fest=-=a
la zanahoria=die Karotte;die Möhre=E=n
la abeja=die Biene=N=n
cariñoso|cariñosa=liebevoll=O=a
el refugiado|la refugiada=der Flüchtling=P=n
diecinueve=neunzehn=Z=x
el inversor|la inversora=der Investor;der Anleger=G=n
la ceja=die Augenbraue=K=n
el relámpago=der Blitz=N=n
el cajero automático=der Geldautomat=G=n
la sartén=die Pfanne=A=n
la escoba=der Besen=A=n
el votante|la votante;el elector|la electora=der Wähler;die Wählerin=P=n
la verdura;la hortaliza=das Gemüse=E=n
la merienda=der Nachmittagsimbiss;die Zwischenmahlzeit=E=n
la hormiga=die Ameise=N=n
el mosquito=die Mücke=N=n
el pepino=die Gurke=E=n
el pijama=der Schlafanzug=A=n
el gemelo|la gemela=der Zwilling=M=n
la galleta=der Keks=E=n
la carnicería=die Metzgerei=R=n
numeroso|numerosa=zahlreich=-=a
el patrocinador;patrocinar=der Sponsor;sponsern=G=n
el bombero|la bombera=der Feuerwehrmann;die Feuerwehrfrau=S=n
el murciélago;el bate=die Fledermaus;der Schläger=N=n
el grifo=der Wasserhahn=A=n
el yogur=der Joghurt=E=n
la lavadora=die Waschmaschine=A=n
deprisa=schnell;eilig=-=d
soleado|soleada=sonnig=N=a
la gasolinera=die Tankstelle=R=n
la furgoneta=der Lieferwagen;der Transporter=R=n
el enchufe=die Steckdose;der Stecker=T=n
la bombilla=die Glühbirne=A=n
la bufanda=der Schal=A=n
hambriento|hambrienta=hungrig=E=a
afilado|afilada;agudo|aguda=scharf;spitz=-=a
la ardilla=das Eichhörnchen=N=n
la salchicha=die Wurst;das Würstchen=E=n
el panadero|la panadera=der Bäcker;die Bäckerin=S=n
la tableta=das Tablet=T=n
la membresía;la afiliación=die Mitgliedschaft=-=n
el pimiento=die Paprika=E=n
la pulgada=der Zoll=Z=n
diminuto|diminuta;minúsculo|minúscula=winzig=-=a
el enfermero|la enfermera=die Krankenschwester;der Krankenpfleger=K=n
el peluquero|la peluquera=der Friseur;die Friseurin=S=n
el alfiler;el pin=die Nadel;die PIN=-=n
el estuche=das Mäppchen;das Etui=S=n
la sandía=die Wassermelone=E=n
resbalar=ausrutschen;rutschen=-=v
perezoso|perezosa=faul=O=a
áspero|áspera;aproximado|aproximada=rau;grob=-=a
el cuenco;el bol=die Schüssel=A=n
el bocadillo;el sándwich=das Sandwich;das belegte Brot=E=n
el cartero|la cartera=der Briefträger;die Briefträgerin=S=n
el búho=die Eule=N=n
el céntimo;el centavo=der Cent=G=n
la servilleta=die Serviette=E=n
columpiarse;el columpio=schwingen;die Schaukel=-=v
la tiza=die Kreide=S=n
la cebra=das Zebra=N=n
divorciado|divorciada=geschieden=M=a
el filete=das Steak;das Filet=E=n
cualificado|cualificada=qualifiziert=S=a
la jirafa=die Giraffe=N=n
anteayer=vorgestern=Z=d
atascado|atascada=stecken geblieben;festgefahren=-=a
la estantería=das Regal=A=n
el melocotón=der Pfirsich=E=n
maleducado|maleducada=unhöflich;frech=O=a
el riel;la barandilla=die Schiene;das Geländer=R=n
`;
