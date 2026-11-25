// ===== faecher/wortliste.js · Englisch-Vokabeln: die 2500 häufigsten englischen Wörter (seit v0.15) =====
// Reihenfolge = Häufigkeit (Zeile 1 = häufigstes Wort; Grundlage: wordfreq-Häufigkeitsliste, Wortformen auf die Grundform zusammengeführt,
// Namen, Kürzel, Umgangssprache und Schimpfwörter aussortiert).
// Eine Zeile:  englisch=deutsch=Thema=Wortart
//   englisch: Synonyme mit ";" getrennt, Schreibvarianten (amerikanisch/britisch) mit "|" (zählen als dasselbe Wort, kein Synonym-Bonus)
//   deutsch:  erlaubte Übersetzungen mit ";" (die erste wird bei Deutsch → Englisch gezeigt), Nomen mit Artikel
//   Thema:    A Alltag & Zuhause · E Essen & Trinken · M Menschen & Familie · K Körper & Gesundheit · S Schule & Arbeit · N Natur & Tiere
//             R Stadt, Reisen & Verkehr · T Technik & Medien · P Politik & Gesellschaft · G Wirtschaft & Geld · F Freizeit, Sport & Kultur
//             Z Zeit & Zahlen · O Gefühle & Charakter · - ohne Thema (nur in „Alle Wörter“ und bei den Wortarten)
//   Wortart:  n Nomen · v Verb · a Adjektiv · d Adverb · x kleines Wort (Pronomen, Präposition, Konjunktion, Zahl …)
// Neue Wörter einfach unten anhängen (bitte keine Zeile umsortieren, die Schwierigkeit hängt an der Position).
export const RAW = `
the=der;die;das=-=x
be=sein=-=v
to=zu;nach=-=x
and=und=-=x
of=von=-=x
a;an=ein;eine=-=x
in=in=-=x
I=ich=-=x
for=für=-=x
that=dass;das;jener=-=x
have=haben=-=v
you=du;ihr;Sie=-=x
it=es=-=x
on=auf;an=-=x
with=mit=-=x
this=dies;dieser;diese;dieses=-=x
as=als;wie=-=x
at=an;bei;um=-=x
he=er=-=x
not=nicht=-=x
will=werden;der Wille=-=v
by=von;durch;bei=-=x
but=aber;sondern=-=x
from=von;aus=-=x
can=können;die Dose=-=v
my=mein;meine=-=x
do=tun;machen=-=v
or=oder=-=x
we=wir=-=x
your=dein;deine;euer;Ihr=-=x
all=alle;alles;ganz=-=x
so=so;also=-=x
get=bekommen;holen;kriegen=-=v
his=sein;seine=-=x
they=sie=-=x
one=eins;ein;man=Z=x
me=mich;mir=-=x
if=wenn;falls;ob=-=x
like=mögen;wie=-=v
just=nur;gerade;einfach=-=d
make=machen;herstellen=-=v
about=über;ungefähr=-=x
up=hoch;nach oben;auf=-=x
out=aus;hinaus;raus=-=x
what=was=-=x
when=wann;wenn;als=-=x
more=mehr=-=x
no=nein;kein=-=x
who=wer=-=x
their=ihr;ihre=-=x
say=sagen=-=v
there=dort;da=-=d
her=sie;ihr;ihre=-=x
which=welcher;welche;welches;der;die;das=-=x
much=viel=-=x
year=das Jahr=Z=n
she=sie=-=x
new=neu=-=a
people=die Leute;die Menschen=M=n
how=wie=-=x
see=sehen=-=v
other=andere;anderer;anderes=-=a
go=gehen;fahren=-=v
know=wissen;kennen=-=v
some=einige;manche;etwas=-=x
also=auch=-=d
them=sie;ihnen=-=x
take=nehmen=-=v
now=jetzt;nun=Z=d
think=denken;glauben=-=v
may=dürfen;können;vielleicht=-=v
its=sein;seine;ihr;ihre=-=x
our=unser;unsere=-=x
look=schauen;aussehen;gucken=-=v
good=gut=-=a
than=als=-=x
need=brauchen;benötigen=-=v
only=nur;einzig=-=d
day=der Tag=Z=n
after=nach;nachdem=Z=x
first=erste;erster;erstes;zuerst=Z=a
him=ihn;ihm=-=x
into=in;hinein=-=x
want=wollen=-=v
two=zwei=Z=x
work=arbeiten;die Arbeit=S=v
over=über;vorbei=-=x
any=irgendein;jeder;beliebig=-=x
then=dann;damals=Z=d
way=der Weg;die Art=-=n
back=zurück;der Rücken=-=d
these=diese=-=x
us=uns=-=x
find=finden=-=v
well=gut;also;der Brunnen=-=d
shall=sollen;werden=-=v
thing=das Ding;die Sache=-=n
because=weil=-=x
right=richtig;rechts;das Recht=-=a
use=benutzen;verwenden;nutzen=-=v
state=der Staat;der Zustand;angeben=P=n
very=sehr=-=d
where=wo;wohin=-=x
man=der Mann;der Mensch=M=n
even=sogar;selbst;gerade=-=d
give=geben=-=v
here=hier=-=d
really=wirklich=-=d
come=kommen=-=v
life=das Leben=M=n
great=großartig;toll;groß=-=a
call=anrufen;rufen;nennen=-=v
play=spielen=F=v
show=zeigen;die Show;die Sendung=-=v
before=vor;bevor;vorher=Z=x
off=aus;weg;ab=-=x
why=warum;wieso=-=x
still=noch;immer noch;still=-=d
tell=erzählen;sagen=-=v
game=das Spiel=F=n
many=viele=-=x
never=nie;niemals=Z=d
long=lang=-=a
love=lieben;die Liebe=O=v
those=jene;die=-=x
world=die Welt=N=n
start=anfangen;beginnen;starten;der Start=-=v
high=hoch=-=a
down=runter;hinunter;nach unten=-=x
last=letzte;letzter;letztes;dauern=Z=a
through=durch=-=x
while=während;die Weile=Z=x
part=der Teil=-=n
home=das Zuhause;zu Hause;das Heim=A=n
help=helfen;die Hilfe=-=v
best=beste;bester;bestes;am besten=-=a
such=solch;solche;so=-=x
keep=behalten;halten=-=v
old=alt=-=a
change=ändern;wechseln;die Änderung=-=v
something=etwas=-=x
try=versuchen;probieren=-=v
place=der Ort;der Platz;die Stelle=R=n
same=gleich;selbe;derselbe=-=a
school=die Schule=S=n
end=das Ende;beenden=-=n
both=beide=-=x
every=jeder;jede;jedes=-=x
big=groß=-=a
three=drei=Z=x
woman=die Frau=M=n
around=herum;um;ungefähr=-=x
between=zwischen=-=x
name=der Name;nennen=M=n
include=einschließen;beinhalten=-=v
less=weniger=-=x
always=immer=Z=d
better=besser=-=a
thank=danken=-=v
house=das Haus=A=n
put=legen;stellen;setzen=-=v
little=klein;wenig=-=a
since=seit;da=Z=x
team=die Mannschaft;das Team=F=n
another=noch ein;ein anderer=-=x
company=die Firma;das Unternehmen=G=n
win=gewinnen;der Sieg=F=v
feel=fühlen;sich fühlen=O=v
family=die Familie=M=n
talk=reden;sprechen;das Gespräch=-=v
ask=fragen;bitten=-=v
under=unter=-=x
point=der Punkt;zeigen=-=n
during=während=Z=x
number=die Zahl;die Nummer;die Anzahl=Z=n
week=die Woche=Z=n
service=der Dienst;der Service=G=n
guy=der Typ;der Kerl=M=n
group=die Gruppe=M=n
friend=der Freund;die Freundin=M=n
again=wieder;nochmal=-=d
next=nächste;nächster;nächstes=-=a
second=zweite;zweiter;die Sekunde=Z=a
child=das Kind=M=n
each=jeder;jede;jedes=-=x
Mr=Herr=M=n
without=ohne=-=x
lot=die Menge;viel=-=n
system=das System=T=n
against=gegen=-=x
must=müssen=-=v
city=die Stadt;die Großstadt=R=n
sure=sicher=-=a
case=der Fall;das Gehäuse=-=n
support=unterstützen;die Unterstützung=-=v
let=lassen=-=v
become=werden=-=v
pay=bezahlen;zahlen=G=v
ever=je;jemals=Z=d
please=bitte=-=x
run=rennen;laufen=F=v
lose=verlieren=-=v
stop=aufhören;anhalten;stoppen=-=v
set=setzen;stellen;das Set=-=v
money=das Geld=G=n
country=das Land;der Staat=P=n
night=die Nacht=Z=n
hand=die Hand=K=n
free=frei;kostenlos;gratis=-=a
lead=führen;leiten=-=v
area=das Gebiet;der Bereich;die Gegend=R=n
someone=jemand=-=x
mean=bedeuten;meinen;gemein=-=v
bad=schlecht;schlimm=-=a
bring=bringen;mitbringen=-=v
live=leben;wohnen=-=v
believe=glauben=-=v
book=das Buch;buchen=S=n
few=wenige=-=x
away=weg;entfernt=-=d
left=links;übrig=-=a
care=sich kümmern;die Pflege;die Sorge=-=v
job=der Job;die Arbeit;die Stelle=S=n
line=die Linie;die Zeile;die Schlange=-=n
business=das Geschäft;das Unternehmen=G=n
until=bis=Z=x
problem=das Problem=-=n
happen=passieren;geschehen=-=v
hour=die Stunde=Z=n
month=der Monat=Z=n
government=die Regierung=P=n
open=öffnen;offen=-=v
power=die Macht;die Kraft;der Strom=-=n
real=echt;wirklich=-=a
small=klein=-=a
god=der Gott=P=n
top=oben;die Spitze;das Oberteil=-=n
large=groß=-=a
turn=drehen;abbiegen;umdrehen=-=v
watch=anschauen;zuschauen;die Uhr=-=v
different=anders;verschieden;unterschiedlich=-=a
hard=hart;schwer;schwierig=-=a
report=der Bericht;berichten=-=n
girl=das Mädchen=M=n
party=die Party;die Partei;die Feier=F=n
issue=das Thema;die Frage;die Ausgabe=-=n
person=die Person;der Mensch=M=n
however=jedoch;allerdings=-=d
early=früh=Z=a
cause=verursachen;die Ursache=-=v
leave=verlassen;gehen;lassen=-=v
question=die Frage=S=n
member=das Mitglied=M=n
result=das Ergebnis;das Resultat=-=n
public=öffentlich;die Öffentlichkeit=P=a
story=die Geschichte=F=n
head=der Kopf=K=n
side=die Seite=-=n
hold=halten=-=v
hope=hoffen;die Hoffnung=O=v
law=das Gesetz;das Recht=P=n
move=bewegen;umziehen;die Bewegung=-=v
read=lesen=S=v
write=schreiben=S=v
order=bestellen;die Bestellung;die Reihenfolge;der Befehl=-=v
hear=hören=K=v
wait=warten=-=v
provide=bereitstellen;liefern;bieten=-=v
seem=scheinen=-=v
word=das Wort=S=n
car=das Auto;der Wagen=R=n
water=das Wasser=N=n
buy=kaufen=G=v
already=schon;bereits=Z=d
anything=irgendetwas;alles=-=x
nothing=nichts=-=x
today=heute=Z=d
player=der Spieler;die Spielerin=F=n
level=die Ebene;das Niveau;das Level=-=n
force=zwingen;die Kraft;die Gewalt=-=v
enough=genug=-=x
everything=alles=-=x
full=voll=-=a
yet=noch;schon;doch=-=d
plan=planen;der Plan=-=v
four=vier=Z=x
once=einmal;sobald=Z=d
add=hinzufügen;addieren=-=v
white=weiß=-=a
season=die Jahreszeit;die Saison;die Staffel=Z=n
national=national=P=a
meet=treffen;kennenlernen=-=v
music=die Musik=F=n
video=das Video=T=n
young=jung=-=a
send=senden;schicken=-=v
war=der Krieg=P=n
far=weit;fern=-=a
face=das Gesicht=K=n
though=obwohl;doch=-=x
yes=ja=-=x
follow=folgen=-=v
kind=die Art;die Sorte;freundlich;nett=-=n
kill=töten=-=v
fact=die Tatsache;der Fakt=-=n
actually=eigentlich;tatsächlich=-=d
later=später=Z=d
hit=schlagen;treffen=-=v
kid=das Kind=M=n
reason=der Grund=-=n
course=der Kurs;der Lauf;der Gang=S=n
study=lernen;studieren;die Studie=S=v
continue=weitermachen;fortsetzen=-=v
late=spät;zu spät=Z=a
black=schwarz=-=a
stay=bleiben;übernachten=-=v
die=sterben=-=v
general=allgemein;der General=-=a
body=der Körper=K=n
fight=kämpfen;der Kampf;streiten=-=v
minute=die Minute=Z=n
mind=der Verstand;der Geist;etwas dagegen haben=-=n
idea=die Idee=-=n
allow=erlauben=-=v
term=der Begriff;die Amtszeit;das Halbjahr=-=n
everyone;everybody=jeder;alle=-=x
president=der Präsident;die Präsidentin=P=n
matter=die Angelegenheit;wichtig sein=-=n
return=zurückkehren;zurückgeben;die Rückkehr=-=v
share=teilen;der Anteil=-=v
together=zusammen=-=d
whole=ganz=-=a
class=die Klasse;der Unterricht=S=n
record=aufnehmen;der Rekord;die Schallplatte=-=v
check=prüfen;überprüfen;kontrollieren=-=v
court=das Gericht;der Platz=P=n
understand=verstehen=-=v
create=erschaffen;erstellen;schaffen=-=v
death=der Tod=M=n
single=einzeln;ledig;einzig=-=a
student=der Schüler;der Student;die Schülerin=S=n
five=fünf=Z=x
maybe;perhaps=vielleicht=-=d
room=das Zimmer;der Raum;der Platz=A=n
office=das Büro=S=n
local=örtlich;lokal;hiesig=-=a
remember=sich erinnern;sich merken=-=v
grow=wachsen;anbauen=N=v
control=kontrollieren;steuern;die Kontrolle=-=v
food=das Essen;die Nahrung;das Lebensmittel=E=n
eye=das Auge=K=n
health=die Gesundheit=K=n
important=wichtig=-=a
news=die Nachrichten;die Neuigkeit=T=n
within=innerhalb=-=x
form=das Formular;die Form;bilden=-=n
light=das Licht;hell;leicht=-=n
event=das Ereignis;die Veranstaltung=F=n
community=die Gemeinschaft;die Gemeinde=P=n
receive=erhalten;bekommen;empfangen=-=v
release=veröffentlichen;freilassen=-=v
able=fähig=-=a
information=die Information;die Auskunft=T=n
university=die Universität;die Uni=S=n
sign=das Schild;das Zeichen;unterschreiben=-=n
price=der Preis=G=n
sell=verkaufen=G=v
program|programme=das Programm=T=n
cost=kosten;die Kosten=G=v
human=menschlich;der Mensch=M=a
list=die Liste=-=n
deal=der Deal;das Geschäft;handeln=G=n
design=gestalten;entwerfen;das Design=-=v
ago=vor=Z=x
social=sozial;gesellschaftlich=P=a
act=handeln;die Tat;spielen=-=v
easy=leicht;einfach=-=a
walk=gehen;spazieren gehen;laufen=-=v
spend=ausgeben;verbringen=G=v
million=die Million=Z=n
fire=das Feuer;feuern=-=n
half=halb;die Hälfte=Z=a
often=oft=Z=d
type=die Art;der Typ;tippen=-=n
vote=wählen;abstimmen;die Stimme=P=v
view=die Aussicht;die Ansicht;der Blick=-=n
boy=der Junge=M=n
close=schließen;nah;zumachen=-=v
song=das Lied;der Song=F=n
south=der Süden;südlich=R=n
true=wahr;richtig=-=a
date=das Datum;das Date;die Verabredung=Z=n
begin=beginnen;anfangen=-=v
eat=essen=E=v
history=die Geschichte=S=n
bit=das bisschen;das Stück=-=n
sound=der Klang;das Geräusch;klingen=-=n
art=die Kunst=F=n
almost=fast;beinahe=-=d
research=die Forschung;forschen=S=n
several=mehrere=-=x
wrong=falsch=-=a
present=das Geschenk;die Gegenwart;präsentieren=-=n
star=der Stern;der Star=N=n
action=die Handlung;die Aktion=-=n
building=das Gebäude=R=n
speak=sprechen=-=v
age=das Alter;das Zeitalter=M=n
short=kurz=-=a
air=die Luft=N=n
miss=vermissen;verpassen=O=v
project=das Projekt=S=n
along=entlang=-=x
anyone;anybody=irgendjemand;jeder=-=x
else=sonst;anders=-=d
pretty=hübsch;ziemlich=-=a
low=niedrig;tief=-=a
offer=anbieten;das Angebot=G=v
street=die Straße=R=n
build=bauen=-=v
market=der Markt=G=n
happy=glücklich;froh=O=a
save=retten;sparen;speichern=-=v
break=brechen;die Pause;kaputt machen=-=v
nice=nett;schön=-=a
probably=wahrscheinlich=-=d
experience=die Erfahrung;das Erlebnis;erleben=-=n
rate=die Rate;bewerten=-=n
test=der Test;die Prüfung;testen=S=n
learn=lernen=S=v
heart=das Herz=K=n
international=international=P=a
past=die Vergangenheit;vorbei;vergangen=Z=n
possible=möglich=-=a
example=das Beispiel=S=n
film;movie=der Film=F=n
phone;telephone=das Telefon;das Handy=T=n
soon=bald=Z=d
claim=behaupten;die Behauptung;beanspruchen=-=v
require=erfordern;benötigen=-=v
picture=das Bild;das Foto=-=n
due=fällig;wegen=-=a
series=die Serie;die Reihe=F=n
special=besonders;speziell=-=a
attack=angreifen;der Angriff=P=v
fall=fallen;der Herbst;der Sturz=-=v
pass=bestehen;vorbeigehen;passen=-=v
son=der Sohn=M=n
account=das Konto;der Bericht=G=n
rule=die Regel;herrschen=-=n
appear=erscheinen;auftauchen=-=v
site=der Ort;die Website;die Baustelle=-=n
future=die Zukunft;zukünftig=Z=n
development=die Entwicklung=-=n
answer=die Antwort;antworten=S=n
cover=bedecken;das Cover;die Decke=-=v
process=der Prozess;der Vorgang;verarbeiten=-=n
final=letzte;endgültig;das Finale=-=a
data=die Daten=T=n
north=der Norden;nördlich=R=n
morning=der Morgen;der Vormittag=Z=n
pick=pflücken;auswählen;abholen=-=v
red=rot=-=a
third=dritte;dritter;drittes;das Drittel=Z=a
bank=die Bank;das Ufer=G=n
position=die Position;die Stellung=-=n
stand=stehen=-=v
moment=der Moment;der Augenblick=Z=n
strong=stark=-=a
chance=die Chance;die Gelegenheit;der Zufall=-=n
step=der Schritt;die Stufe;treten=-=n
either=entweder;einer von beiden=-=x
police=die Polizei=P=n
field=das Feld;der Bereich=N=n
decide=entscheiden;beschließen=-=v
baby=das Baby=M=n
source=die Quelle=-=n
road=die Straße=R=n
rather=eher;lieber;ziemlich=-=d
whether=ob=-=x
feature=die Eigenschaft;das Merkmal;die Funktion=-=n
shot=der Schuss;die Aufnahme=-=n
near=nah;in der Nähe von=-=a
land=das Land;landen=N=n
major=groß;bedeutend;wichtig=-=a
character=der Charakter;die Figur=-=n
goal=das Ziel;das Tor=F=n
park=der Park;parken=R=n
among=unter;zwischen=-=x
further=weiter=-=d
myself=mich selbst;ich selbst=-=x
yourself=dich selbst;du selbst=-=x
college=das College;die Hochschule=S=n
wear=tragen;anhaben=A=v
board=das Brett;die Tafel;der Vorstand=-=n
sale=der Verkauf;der Ausverkauf=G=n
reach=erreichen=-=v
cut=schneiden;der Schnitt=-=v
figure=die Zahl;die Figur;herausfinden=-=n
although=obwohl=-=x
fun=der Spaß;lustig=F=n
living=lebendig;der Lebensunterhalt=-=a
trade=der Handel;handeln=G=n
policy=die Politik;die Richtlinie=P=n
parent=der Elternteil;die Eltern=M=n
clear=klar;deutlich=-=a
product=das Produkt=G=n
develop=entwickeln=-=v
town=die Stadt;die Kleinstadt=R=n
involve=beteiligen;beinhalten=-=v
enjoy=genießen=O=v
finish=beenden;fertig machen;das Ende=-=v
fast=schnell;fasten=-=a
review=die Bewertung;die Kritik;überprüfen=-=n
fine=gut;fein;in Ordnung;die Geldstrafe=-=a
behind=hinter=-=x
political=politisch=P=a
quite=ziemlich;ganz=-=d
six=sechs=Z=x
west=der Westen;westlich=R=n
mother=die Mutter=M=n
March=der März=Z=n
carry=tragen=-=v
drop=fallen lassen;der Tropfen=-=v
link=der Link;die Verbindung;verbinden=T=n
father=der Vater=M=n
interest=das Interesse;die Zinsen=-=n
wish=wünschen;der Wunsch=O=v
forget=vergessen=-=v
available=verfügbar;erhältlich=-=a
education=die Bildung;die Erziehung=S=n
former=ehemalig;früher=-=a
front=die Vorderseite;vorne=-=n
ready=bereit;fertig=-=a
sometimes=manchmal=Z=d
club=der Verein;der Club=F=n
fan=der Fan;der Ventilator=F=n
model=das Modell;das Model=-=n
note=die Notiz;die Note;bemerken=S=n
space=der Raum;der Platz;der Weltraum=-=n
visit=besuchen;der Besuch=-=v
relationship=die Beziehung=M=n
value=der Wert=-=n
feeling=das Gefühl=O=n
couple=das Paar;ein paar=M=n
current=aktuell;gegenwärtig;die Strömung=Z=a
lie=lügen;liegen;die Lüge=-=v
official=offiziell;der Beamte=P=a
department=die Abteilung=S=n
dog=der Hund=N=n
match=das Spiel;das Streichholz;passen=F=n
period=der Zeitraum;die Periode;die Unterrichtsstunde=Z=n
tax=die Steuer=G=n
effect=die Wirkung;der Effekt=-=n
choose=wählen;aussuchen=-=v
wife=die Ehefrau;die Frau=M=n
center|centre=das Zentrum;die Mitte=R=n
industry=die Industrie;die Branche=G=n
agree=zustimmen;einverstanden sein=-=v
officer=der Offizier;der Polizist;der Beamte=P=n
describe=beschreiben=-=v
produce=herstellen;produzieren=G=v
across=über;quer durch;gegenüber=-=x
himself=sich;sich selbst;er selbst=-=x
outside=draußen;außerhalb=-=d
brother=der Bruder=M=n
catch=fangen;erwischen=-=v
listen=zuhören;hören=-=v
summer=der Sommer=Z=n
race=das Rennen;die Rasse=F=n
decision=die Entscheidung=-=n
security=die Sicherheit=P=n
focus=sich konzentrieren;der Fokus=-=v
article=der Artikel=T=n
bill=die Rechnung;der Gesetzentwurf;der Geldschein=G=n
instead=stattdessen=-=d
main=Haupt-;hauptsächlich=-=a
king=der König=P=n
page=die Seite=S=n
property=das Eigentum;die Immobilie;die Eigenschaft=G=n
role=die Rolle=-=n
common=gemeinsam;üblich;häufig=-=a
foot=der Fuß=K=n
meeting=das Treffen;die Besprechung;die Sitzung=S=n
press=drücken;die Presse=T=v
energy=die Energie=T=n
rest=die Pause;der Rest;sich ausruhen=-=n
director=der Direktor;der Regisseur;der Leiter=S=n
size=die Größe=-=n
sleep=schlafen;der Schlaf=A=v
comment=der Kommentar;kommentieren=T=n
ground=der Boden;der Grund=N=n
condition=der Zustand;die Bedingung=-=n
charge=aufladen;berechnen;die Gebühr;anklagen=-=v
card=die Karte=-=n
standard=der Standard;die Norm=-=n
practice=üben;die Übung;die Praxis=S=n
drink=trinken;das Getränk=E=v
America=Amerika=R=n
beautiful=schön=-=a
hate=hassen;der Hass=O=v
election=die Wahl=P=n
join=beitreten;mitmachen;verbinden=-=v
individual=einzeln;individuell;der Einzelne=-=a
performance=die Leistung;die Aufführung=F=n
ship=das Schiff;verschicken=R=n
range=die Reichweite;die Auswahl;der Bereich=-=n
church=die Kirche=P=n
raise=heben;erhöhen;großziehen=-=v
sense=der Sinn;das Gefühl;spüren=-=n
store=das Geschäft;der Laden;lagern=G=n
piece=das Stück=-=n
trust=vertrauen;das Vertrauen=O=v
especially=besonders=-=d
June=der Juni=Z=n
similar=ähnlich=-=a
total=gesamt;die Summe=Z=a
guess=raten;schätzen;vermuten=-=v
mine=meins;meiner;meine;das Bergwerk=-=x
photo=das Foto=F=n
amount=die Menge;der Betrag=Z=n
society=die Gesellschaft=P=n
track=die Spur;das Gleis;der Titel;verfolgen=-=n
serve=dienen;servieren;bedienen=-=v
explain=erklären=S=v
stage=die Bühne;die Phase;die Stufe=F=n
throw=werfen=F=v
above=über;oberhalb=-=x
likely=wahrscheinlich=-=a
military=militärisch;das Militär=P=a
perfect=perfekt;vollkommen=-=a
personal=persönlich=-=a
TV=der Fernseher;das Fernsehen=T=n
round=rund;die Runde=-=a
paper=das Papier;die Zeitung;die Arbeit=S=n
average=durchschnittlich;der Durchschnitt=Z=a
operation=die Operation;der Betrieb=K=n
blue=blau=-=a
key=der Schlüssel;die Taste=A=n
science=die Wissenschaft;die Naturwissenschaft=S=n
sport=der Sport=F=n
April=der April=Z=n
dead=tot=-=a
English=englisch;das Englisch=S=a
inside=drinnen;innen;innerhalb=-=d
online=online=T=a
private=privat=-=a
door=die Tür=A=n
travel=reisen;die Reise=R=v
drive=fahren;die Fahrt=R=v
leader=der Anführer;der Leiter;der Führer=P=n
activity=die Aktivität;die Tätigkeit=F=n
enter=eintreten;betreten;eingeben=-=v
style=der Stil=-=n
hot=heiß=-=a
suggest=vorschlagen=-=v
cool=cool;kühl=-=a
situation=die Situation;die Lage=-=n
language=die Sprache=S=n
consider=überlegen;betrachten;in Betracht ziehen=-=v
remain=bleiben;übrig bleiben=-=v
title=der Titel=-=n
wall=die Wand;die Mauer=A=n
British=britisch=P=a
middle=die Mitte;mittlere=-=n
sorry=Entschuldigung;es tut mir leid=O=x
training=das Training;die Ausbildung=F=n
award=der Preis;die Auszeichnung;verleihen=-=n
material=das Material;der Stoff=-=n
choice=die Wahl;die Auswahl=-=n
increase=erhöhen;steigen;die Zunahme=-=v
finally=endlich;schließlich=-=d
gold=das Gold=N=n
July=der Juli=Z=n
unit=die Einheit=-=n
train=der Zug;trainieren=R=n
stuff=das Zeug;die Sachen=A=n
box=die Kiste;die Schachtel;der Karton=A=n
production=die Produktion;die Herstellung=G=n
pull=ziehen=-=v
loss=der Verlust=-=n
alone=allein=-=a
certain=sicher;bestimmt;gewiss=-=a
east=der Osten;östlich=R=n
medical=medizinisch;ärztlich=K=a
original=ursprünglich;original;das Original=-=a
themselves=sich;sich selbst;sie selbst=-=x
worth=wert;der Wert=G=a
wonder=sich fragen;sich wundern;das Wunder=-=v
technology=die Technik;die Technologie=T=n
image=das Bild=-=n
ball=der Ball=F=n
league=die Liga=F=n
mark=markieren;die Markierung;die Note=-=v
lower=niedriger;senken=-=a
green=grün=-=a
effort=die Mühe;die Anstrengung=-=n
network=das Netzwerk;das Netz=T=n
cup=die Tasse;der Pokal;der Becher=A=n
message=die Nachricht;die Botschaft=T=n
exactly=genau=-=d
September=der September=Z=n
usually=normalerweise;meistens=-=d
chief=der Chef;der Häuptling;Haupt-=-=n
fund=der Fonds;finanzieren=G=n
quality=die Qualität=-=n
patient=der Patient;geduldig=K=n
benefit=der Vorteil;der Nutzen;profitieren=-=n
plant=die Pflanze;pflanzen;das Werk=N=n
version=die Version;die Fassung=-=n
voice=die Stimme=K=n
mom|mum=die Mama;die Mutti=M=n
mention=erwähnen=-=v
nation=die Nation;das Volk=P=n
mile=die Meile=Z=n
station=der Bahnhof;die Station;der Sender=R=n
hospital=das Krankenhaus=K=n
sit=sitzen;sich setzen=-=v
evidence=der Beweis;die Beweise=P=n
deep=tief=-=a
challenge=die Herausforderung;herausfordern=-=n
treat=behandeln;einladen;der Leckerbissen=-=v
complete=vollständig;komplett;beenden=-=a
union=die Union;die Gewerkschaft=P=n
gun=die Waffe;die Pistole;das Gewehr=P=n
remove=entfernen=-=v
rock=der Felsen;der Stein;der Rock=N=n
daughter=die Tochter=M=n
expect=erwarten=-=v
judge=der Richter;beurteilen=P=n
code=der Code=T=n
difference=der Unterschied=-=n
management=die Leitung;das Management;die Verwaltung=G=n
beat=schlagen;besiegen;der Takt=-=v
letter=der Brief;der Buchstabe=S=n
dream=träumen;der Traum=O=v
risk=das Risiko;riskieren=-=n
region=die Region;die Gegend=R=n
animal=das Tier=N=n
island=die Insel=N=n
oil=das Öl=N=n
drug=das Medikament;die Droge=K=n
lady=die Dame=M=n
approach=sich nähern;der Ansatz=-=v
central=zentral=-=a
England=England=R=n
forward=vorwärts;nach vorne;weiterleiten=-=d
various=verschiedene=-=a
minister=der Minister;die Ministerin=P=n
bed=das Bett=A=n
table=der Tisch;die Tabelle=A=n
improve=verbessern=-=v
scene=die Szene;der Schauplatz=F=n
teacher=der Lehrer;die Lehrerin=S=n
search=suchen;die Suche=-=v
compare=vergleichen=-=v
district=der Bezirk;das Viertel=R=n
cell=die Zelle=N=n
notice=bemerken;die Notiz;der Hinweis=-=v
organization|organisation=die Organisation=P=n
reduce=reduzieren;verringern=-=v
opportunity=die Gelegenheit;die Möglichkeit;die Chance=-=n
cross=überqueren;das Kreuz=-=v
publish=veröffentlichen=T=v
professional=professionell;beruflich;der Profi=S=a
safe=sicher;der Tresor=-=a
attention=die Aufmerksamkeit=S=n
football;soccer=der Fußball=F=n
natural=natürlich=N=a
October=der Oktober=Z=n
career=die Karriere;die Laufbahn=S=n
coach=der Trainer;der Reisebus=F=n
council=der Rat;der Stadtrat=P=n
clean=sauber;putzen;reinigen=A=a
respect=der Respekt;respektieren=O=n
dance=tanzen;der Tanz=F=v
touch=berühren;anfassen;die Berührung=-=v
base=die Basis;der Stützpunkt=-=n
river=der Fluss=N=n
gain=gewinnen;zunehmen;der Gewinn=-=v
simple=einfach;schlicht=-=a
response=die Antwort;die Reaktion=-=n
push=drücken;schieben=-=v
credit=der Kredit;die Anerkennung=G=n
amazing=erstaunlich;toll;unglaublich=O=a
August=der August=Z=n
blood=das Blut=K=n
China=China=R=n
economic=wirtschaftlich=G=a
itself=sich;sich selbst;selbst=-=x
November=der November=Z=n
related=verwandt;zusammenhängend=-=a
serious=ernst;ernsthaft;schwer=-=a
century=das Jahrhundert=Z=n
hair=das Haar;die Haare=K=n
statement=die Aussage;die Erklärung=-=n
announce=ankündigen;bekanntgeben=-=v
fail=scheitern;versagen;durchfallen=-=v
represent=vertreten;darstellen=-=v
address=die Adresse;ansprechen=-=n
female=weiblich=M=a
text=der Text;simsen=T=n
operate=bedienen;betreiben;operieren=-=v
sea=das Meer;die See=N=n
seek=suchen=-=v
born=geboren=M=a
entire=ganz;gesamt=-=a
French=französisch;das Französisch=S=a
January=der Januar=Z=n
poor=arm;schlecht=G=a
website=die Webseite;die Website=T=n
sort=sortieren;die Sorte;die Art=-=v
army=die Armee;das Heer=P=n
section=der Abschnitt;die Abteilung=-=n
culture=die Kultur=F=n
manager=der Manager;der Leiter;der Geschäftsführer=G=n
subject=das Fach;das Thema;das Subjekt=S=n
prove=beweisen=-=v
degree=der Grad;der Abschluss=S=n
contact=der Kontakt;kontaktieren=-=n
realize|realise=erkennen;merken;begreifen=-=v
ride=reiten;fahren;die Fahrt=R=v
establish=gründen;feststellen;etablieren=-=v
attempt=versuchen;der Versuch=-=v
success=der Erfolg=-=n
album=das Album=F=n
bar=die Bar;die Stange;der Riegel=F=n
episode=die Folge;die Episode=F=n
currently=derzeit;zurzeit;gerade=Z=d
European=europäisch=P=a
financial=finanziell=G=a
foreign=ausländisch;fremd=P=a
legal=legal;rechtlich=P=a
seven=sieben=Z=x
simply=einfach;schlicht=-=d
staff=das Personal;die Belegschaft=S=n
super=super;toll=-=a
hurt=verletzen;wehtun=K=v
author=der Autor;die Autorin=F=n
contract=der Vertrag=G=n
tree=der Baum=N=n
arm=der Arm=K=n
access=der Zugang;der Zugriff;zugreifen=T=n
tour=die Tour;die Rundfahrt;die Tournee=R=n
roll=rollen;die Rolle;das Brötchen=-=v
dark=dunkel=-=a
detail=die Einzelheit;das Detail=-=n
supply=liefern;versorgen;der Vorrat=G=v
double=doppelt;verdoppeln=Z=a
population=die Bevölkerung=P=n
damage=der Schaden;beschädigen=-=n
weight=das Gewicht=K=n
crazy=verrückt=-=a
daily=täglich=Z=a
December=der Dezember=Z=n
difficult=schwierig;schwer=-=a
modern=modern=-=a
popular=beliebt;populär=-=a
whose=wessen;dessen;deren=-=x
truth=die Wahrheit=-=n
rise=steigen;aufsteigen;der Anstieg=-=v
count=zählen=Z=v
campaign=die Kampagne;der Wahlkampf=P=n
application=die Bewerbung;der Antrag;die Anwendung=S=n
sister=die Schwester=M=n
worker=der Arbeiter;die Arbeiterin=S=n
speed=die Geschwindigkeit;das Tempo=R=n
file=die Datei;die Akte=T=n
laugh=lachen=O=v
movement=die Bewegung=-=n
window=das Fenster=A=n
content=der Inhalt;zufrieden=-=n
Australia=Australien=R=n
earth=die Erde=N=n
huge=riesig;gewaltig=-=a
internet=das Internet=T=n
sir=der Herr;mein Herr=M=n
towards|toward=in Richtung;gegenüber;auf zu=-=x
doctor=der Arzt;die Ärztin;der Doktor=K=n
computer=der Computer;der Rechner=T=n
option=die Möglichkeit;die Option=-=n
treatment=die Behandlung=K=n
pain=der Schmerz=K=n
seat=der Sitz;der Sitzplatz=-=n
arrive=ankommen=R=v
promise=versprechen;das Versprechen=-=v
opinion=die Meinung=-=n
welcome=willkommen;begrüßen=-=a
conference=die Konferenz=S=n
fear=die Angst;fürchten=O=n
association=der Verband;der Verein;die Verbindung=-=n
owner=der Besitzer;der Eigentümer=G=n
user=der Benutzer;der Nutzer=T=n
below=unter;unterhalb=-=x
ten=zehn=Z=x
target=das Ziel=-=n
surprise=die Überraschung;überraschen=O=n
method=die Methode=S=n
committee=der Ausschuss;das Komitee=P=n
pressure=der Druck=-=n
color|colour=die Farbe=F=n
Europe=Europa=R=n
India=Indien=R=n
percent|per cent=das Prozent=Z=n
recent=neu;jüngst;kürzlich=Z=a
straight=gerade;direkt;geradeaus=-=a
artist=der Künstler;die Künstlerin=F=n
update=aktualisieren;das Update=T=v
murder=der Mord;ermorden=P=n
lack=der Mangel;fehlen=-=n
brown=braun=-=a
launch=starten;einführen;der Start=-=v
refer=sich beziehen;verweisen=-=v
fish=der Fisch;fischen=E=n
protect=schützen=-=v
agency=die Agentur;die Behörde=G=n
wide=breit;weit=-=a
addition=die Ergänzung;die Addition=-=n
purpose=der Zweck;die Absicht=-=n
machine=die Maschine=T=n
host=der Gastgeber;moderieren=F=n
demand=verlangen;fordern;die Nachfrage=G=v
fit=passen;fit=K=v
master=der Meister;beherrschen=-=n
ability=die Fähigkeit=-=n
collection=die Sammlung=F=n
gas=das Gas;das Benzin=N=n
authority=die Behörde;die Autorität=P=n
battle=die Schlacht;der Kampf=P=n
February=der Februar=Z=n
growth=das Wachstum=G=n
married=verheiratet=M=a
specific=bestimmt;spezifisch;konkret=-=a
tonight=heute Abend;heute Nacht=Z=d
band=die Band;das Band=F=n
contain=enthalten=-=v
grant=gewähren;das Stipendium=-=v
draw=zeichnen;ziehen=F=v
husband=der Ehemann;der Mann=M=n
resource=die Ressource;das Hilfsmittel=-=n
hotel=das Hotel=R=n
partner=der Partner;die Partnerin=M=n
interview=das Interview;das Vorstellungsgespräch=T=n
purchase=kaufen;der Kauf=G=v
cold=kalt;die Erkältung=N=a
eight=acht=Z=x
except=außer=-=x
funny=lustig;komisch=O=a
limited=begrenzt;beschränkt=-=a
peace=der Frieden=P=n
recently=kürzlich;neulich=Z=d
tomorrow=morgen=Z=d
concern=die Sorge;betreffen=O=n
crime=das Verbrechen;die Kriminalität=P=n
request=die Anfrage;die Bitte;anfordern=-=n
stock=der Vorrat;die Aktie;das Lager=G=n
quick=schnell;rasch=-=a
favorite|favourite=Lieblings-;der Favorit=-=a
teach=unterrichten;lehren;beibringen=S=v
secret=das Geheimnis;geheim=-=n
exist=existieren;bestehen=-=v
measure=messen;die Maßnahme=Z=v
perform=auftreten;aufführen;leisten=F=v
block=der Block;blockieren=-=n
kick=treten;der Tritt=F=v
thousand=tausend=Z=x
function=die Funktion=T=n
disease=die Krankheit=K=n
direction=die Richtung=R=n
sing=singen=F=v
ahead=voraus;vorne=-=d
capital=die Hauptstadt;das Kapital;der Großbuchstabe=P=n
Chinese=chinesisch=-=a
normal=normal=-=a
potential=möglich;potenziell;das Potenzial=-=a
radio=das Radio=T=n
Russian=russisch=-=a
western=westlich=R=a
adult=der Erwachsene;erwachsen=M=n
brand=die Marke=G=n
location=der Ort;der Standort;die Lage=R=n
customer=der Kunde;die Kundin=G=n
solution=die Lösung=S=n
spring=der Frühling;die Quelle;die Feder;springen=Z=n
hide=verstecken;sich verstecken=-=v
agent=der Agent;der Vertreter=-=n
beginning=der Anfang;der Beginn=Z=n
certainly=sicherlich;bestimmt=-=d
completely=völlig;vollständig;ganz=-=d
despite=trotz=-=x
ice=das Eis=N=n
interesting=interessant=-=a
nearly=fast;beinahe=-=d
particular=bestimmt;besondere=-=a
previous=vorherig;früher=Z=a
quickly=schnell=-=d
discuss=besprechen;diskutieren=-=v
structure=die Struktur;der Aufbau=-=n
cry=weinen;schreien;der Schrei=O=v
dollar=der Dollar=G=n
vehicle=das Fahrzeug=R=n
lay=legen=-=v
spot=der Fleck;die Stelle;entdecken=-=n
apply=sich bewerben;anwenden;beantragen=S=v
fill=füllen=-=v
brain=das Gehirn=K=n
justice=die Gerechtigkeit;die Justiz=P=n
heavy=schwer=-=a
floor=der Boden;der Fußboden;das Stockwerk=A=n
income=das Einkommen=G=n
occur=vorkommen;geschehen;auftreten=-=v
shop=das Geschäft;der Laden;einkaufen=G=n
fair=fair;gerecht;die Messe;der Jahrmarkt=-=a
positive=positiv=-=a
throughout=überall in;während des ganzen=-=x
item=der Gegenstand;der Artikel;der Punkt=-=n
avoid=vermeiden=-=v
commission=die Kommission;die Provision;der Auftrag=P=n
worry=sich sorgen;die Sorge=O=v
copy=kopieren;die Kopie=T=v
deliver=liefern;zustellen=G=v
introduce=vorstellen;einführen=-=v
pop=der Pop;platzen=F=n
trip=die Reise;der Ausflug=R=n
weekend=das Wochenende=Z=n
employee=der Angestellte;der Mitarbeiter=S=n
memory=die Erinnerung;das Gedächtnis;der Speicher=-=n
ring=der Ring;klingeln=-=n
camera=die Kamera=T=n
maintain=aufrechterhalten;warten;pflegen=-=v
absolutely=absolut;völlig=-=d
additional=zusätzlich=-=a
beyond=jenseits;über hinaus=-=x
extra=extra;zusätzlich=-=a
immediately=sofort;unverzüglich=Z=d
nature=die Natur=N=n
significant=bedeutend;erheblich=-=a
unless=außer wenn;es sei denn=-=x
identify=identifizieren;erkennen=-=v
trial=der Prozess;der Versuch=P=n
dress=das Kleid;sich anziehen=A=n
prevent=verhindern=-=v
imagine=sich vorstellen=-=v
hill=der Hügel=N=n
channel=der Kanal;der Sender=T=n
score=die Punktzahl;der Spielstand;punkten=F=n
impact=die Auswirkung;der Aufprall=-=n
male=männlich=M=a
reveal=enthüllen;verraten=-=v
accept=annehmen;akzeptieren=-=v
Canada=Kanada=R=n
construction=der Bau;die Konstruktion=-=n
safety=die Sicherheit=-=n
sun=die Sonne=N=n
waste=verschwenden;der Abfall;der Müll=-=v
glass=das Glas=A=n
theory=die Theorie=S=n
separate=getrennt;trennen=-=a
driver=der Fahrer;die Fahrerin=R=n
leg=das Bein=K=n
beach=der Strand=N=n
rich=reich=G=a
transfer=übertragen;überweisen;die Überweisung=G=v
definitely=auf jeden Fall;definitiv=-=d
Friday=der Freitag=Z=n
knowledge=das Wissen;die Kenntnis=S=n
particularly=besonders=-=d
jump=springen;der Sprung=F=v
print=drucken;der Druck=T=v
weapon=die Waffe=P=n
senior=älter;leitend;der Senior=-=a
destroy=zerstören=-=v
express=ausdrücken;der Express=-=v
slow=langsam=-=a
cent=der Cent=G=n
factor=der Faktor=-=n
defense|defence=die Verteidigung=P=n
winner=der Gewinner;der Sieger=F=n
mission=die Mission;der Auftrag=-=n
steal=stehlen=P=v
commercial=kommerziell;der Werbespot=G=a
strike=der Streik;schlagen;streiken=-=n
fly=fliegen;die Fliege=R=v
direct=direkt;leiten=-=a
marriage=die Ehe;die Heirat=M=n
dad=der Papa;der Vati=M=n
generally=im Allgemeinen;allgemein=-=d
German=deutsch;das Deutsch=S=a
global=weltweit;global=-=a
interested=interessiert=-=a
nobody=niemand=-=x
plus=plus;zuzüglich=Z=x
regular=regelmäßig;normal=-=a
secretary=der Sekretär;die Sekretärin=S=n
agreement=die Vereinbarung;die Zustimmung=-=n
cat=die Katze=N=n
tie=binden;die Krawatte;unentschieden=-=v
flight=der Flug=R=n
bag=die Tasche;die Tüte=A=n
wood=das Holz;der Wald=N=n
doubt=der Zweifel;bezweifeln=-=n
competition=der Wettbewerb;die Konkurrenz=F=n
investment=die Investition;die Geldanlage=G=n
professor=der Professor=S=n
replace=ersetzen=-=v
analysis=die Analyse=S=n
skin=die Haut=K=n
influence=der Einfluss;beeinflussen=-=n
camp=das Lager;zelten=F=n
annual=jährlich=Z=a
anymore=nicht mehr;mehr=-=d
France=Frankreich=R=n
insurance=die Versicherung=G=n
majority=die Mehrheit=P=n
physical=körperlich;physisch=K=a
seriously=ernsthaft;im Ernst=-=d
stupid=dumm;blöd=-=a
successful=erfolgreich=-=a
feed=füttern;ernähren=E=v
communication=die Kommunikation;die Verständigung=T=n
handle=handhaben;der Griff=-=v
schedule=der Zeitplan;der Stundenplan;planen=S=n
library=die Bibliothek;die Bücherei=S=n
farm=der Bauernhof;die Farm=N=n
discover=entdecken=-=v
screen=der Bildschirm;die Leinwand=T=n
depend=abhängen=-=v
reference=der Verweis;die Referenz=-=n
cook=kochen;der Koch=E=v
wind=der Wind=N=n
firm=die Firma;fest=G=n
horse=das Pferd=N=n
device=das Gerät=T=n
generation=die Generation=M=n
division=die Teilung;die Abteilung=-=n
mountain=der Berg=N=n
document=das Dokument;dokumentieren=T=n
struggle=kämpfen;sich abmühen;der Kampf=-=v
exchange=tauschen;umtauschen;der Austausch=G=v
skill=die Fähigkeit;das Können=S=n
active=aktiv=-=a
administration=die Verwaltung;die Regierung=P=n
Australian=australisch=-=a
cancer=der Krebs=K=n
civil=bürgerlich;zivil=P=a
independent=unabhängig=P=a
none=keiner;keine;keines=-=x
Russia=Russland=R=n
spread=verbreiten;sich ausbreiten=-=v
heat=die Hitze;die Wärme;erhitzen=N=n
arrest=verhaften;festnehmen=P=v
environment=die Umwelt;die Umgebung=N=n
writer=der Schriftsteller;der Autor=F=n
gift=das Geschenk;die Gabe=-=n
queen=die Königin=P=n
map=die Karte;die Landkarte=R=n
stone=der Stein=N=n
confirm=bestätigen=-=v
Africa=Afrika=R=n
awesome=toll;großartig;fantastisch=O=a
cash=das Bargeld=G=n
clearly=eindeutig;deutlich;klar=-=d
multiple=mehrere;mehrfach=-=a
Sunday=der Sonntag=Z=n
mass=die Masse;die Messe=-=n
conduct=durchführen;leiten;das Verhalten=-=v
session=die Sitzung=-=n
earn=verdienen=G=v
guide=führen;der Führer;der Ratgeber=R=v
select=auswählen=-=v
injury=die Verletzung=K=n
bird=der Vogel=N=n
burn=brennen;verbrennen=-=v
reality=die Wirklichkeit;die Realität=-=n
grade=die Note;die Klasse;die Stufe=S=n
garden=der Garten=A=n
candidate=der Kandidat;die Kandidatin=P=n
economy=die Wirtschaft=G=n
stick=der Stock;kleben;stecken=-=n
lake=der See=N=n
anyway=sowieso;jedenfalls;trotzdem=-=d
Christmas=Weihnachten=F=n
easily=leicht;mühelos=-=d
grand=großartig;groß=-=a
literally=buchstäblich;wörtlich=-=d
luck=das Glück=O=n
necessary=notwendig;nötig=-=a
sweet=süß=E=a
yesterday=gestern=Z=d
estimate=schätzen;die Schätzung=Z=v
hall=die Halle;der Flur;der Saal=A=n
locate=finden;ausfindig machen=-=v
village=das Dorf=R=n
soul=die Seele=O=n
ticket=die Fahrkarte;das Ticket;die Eintrittskarte=R=n
argue=streiten;argumentieren=-=v
joke=der Witz;scherzen=O=n
loan=der Kredit;das Darlehen;leihen=G=n
limit=die Grenze;das Limit;begrenzen=-=n
aid=die Hilfe;helfen=-=n
click=klicken;der Klick=T=v
refuse=ablehnen;verweigern=-=v
closed=geschlossen;zu=-=a
directly=direkt;unmittelbar=-=d
Germany=Deutschland=R=n
glad=froh=O=a
overall=insgesamt;gesamt=-=a
planning=die Planung=-=n
speech=die Rede;die Sprache=P=n
blow=blasen;pusten;der Schlag=-=v
element=das Element;der Bestandteil=-=n
soldier=der Soldat=P=n
wake=aufwachen;wecken=A=v
achieve=erreichen;schaffen=-=v
bet=wetten;die Wette=-=v
traffic=der Verkehr=R=n
meaning=die Bedeutung=S=n
suit=der Anzug;passen;stehen=A=n
connection=die Verbindung;der Zusammenhang=T=n
recommend=empfehlen=-=v
tip=der Tipp;das Trinkgeld;die Spitze=-=n
bus=der Bus=R=n
surface=die Oberfläche=-=n
bear=der Bär;ertragen=N=n
airport=der Flughafen=R=n
basic=grundlegend;einfach;Grund-=-=a
captain=der Kapitän;der Hauptmann=R=n
effective=wirksam;effektiv=-=a
fully=völlig;vollständig=-=d
highly=hoch;äußerst;sehr=-=d
Japan=Japan=R=n
Mrs=Frau=M=n
winter=der Winter=Z=n
worse=schlechter;schlimmer=-=a
recognize|recognise=erkennen;wiedererkennen=-=v
distance=die Entfernung;die Distanz=R=n
scale=die Waage;der Maßstab;die Skala=-=n
concept=das Konzept;der Begriff=-=n
citizen=der Bürger;die Bürgerin=P=n
rose=die Rose=N=n
spirit=der Geist;die Stimmung=O=n
conversation=das Gespräch;die Unterhaltung=-=n
royal=königlich=P=a
advice=der Rat;der Ratschlag=-=n
broken=kaputt;gebrochen=-=a
equipment=die Ausrüstung;die Geräte=-=n
eventually=schließlich;letztendlich=-=d
holy=heilig=P=a
otherwise=sonst;andernfalls=-=d
primary=hauptsächlich;Grund-;primär=-=a
responsible=verantwortlich=-=a
sick=krank;übel=K=a
setting=die Umgebung;die Einstellung=-=n
payment=die Zahlung;die Bezahlung=G=n
smart=klug;schlau;schick=-=a
promote=fördern;befördern;werben=G=v
tear=reißen;die Träne=-=v
enemy=der Feind=P=n
tool=das Werkzeug=A=n
metal=das Metall=N=n
mistake=der Fehler=S=n
pack=packen;einpacken;die Packung=R=v
fashion=die Mode=A=n
combine=kombinieren;verbinden=-=v
guard=der Wächter;bewachen=-=n
square=der Platz;das Quadrat;quadratisch=R=n
strategy=die Strategie=-=n
display=anzeigen;ausstellen;die Anzeige=T=v
aim=das Ziel;zielen=-=n
coast=die Küste=N=n
nine=neun=Z=x
politics=die Politik=P=n
Saturday=der Samstag;der Sonnabend=Z=n
status=der Status;der Stand=-=n
therefore=deshalb;daher;deswegen=-=d
truly=wirklich;wahrhaft=-=d
weather=das Wetter=N=n
indicate=hinweisen;anzeigen;blinken=-=v
foundation=die Stiftung;die Grundlage;das Fundament=-=n
profile=das Profil=T=n
lock=abschließen;das Schloss=A=v
estate=das Anwesen;der Besitz=G=n
cheap=billig;günstig=G=a
wedding=die Hochzeit=M=n
volume=die Lautstärke;das Volumen;der Band=-=n
champion=der Meister;der Champion=F=n
smile=lächeln;das Lächeln=O=v
define=definieren;festlegen=-=v
profit=der Gewinn;der Profit=G=n
advantage=der Vorteil=-=n
mouth=der Mund=K=n
victim=das Opfer=P=n
ban=verbieten;das Verbot=P=v
app=die App=T=n
coffee=der Kaffee=E=n
complex=komplex;kompliziert=-=a
evening=der Abend=Z=n
freedom=die Freiheit=P=n
investigation=die Untersuchung;die Ermittlung=P=n
load=laden;die Ladung=-=v
duty=die Pflicht;der Zoll=-=n
flow=fließen;der Fluss=-=v
command=der Befehl;befehlen=-=n
quote=zitieren;das Zitat=-=v
budget=das Budget;der Haushalt=G=n
bridge=die Brücke=R=n
trouble=der Ärger;die Schwierigkeiten=-=n
lawyer=der Anwalt;die Anwältin=P=n
reaction=die Reaktion=-=n
decade=das Jahrzehnt=Z=n
actual=tatsächlich;eigentlich=-=a
fat=fett;dick;das Fett=K=a
mobile=mobil;das Handy=T=a
northern=nördlich=R=a
powerful=mächtig;stark=-=a
prior=vorherig;früher=Z=a
protection=der Schutz=-=n
religious=religiös=P=a
wonderful=wunderbar;wundervoll=O=a
wave=die Welle;winken=N=n
taste=schmecken;der Geschmack=E=v
propose=vorschlagen;einen Heiratsantrag machen=-=v
correct=richtig;korrekt;korrigieren=S=a
discussion=die Diskussion;die Besprechung=-=n
criminal=kriminell;der Verbrecher=P=a
responsibility=die Verantwortung=-=n
hero=der Held;die Heldin=-=n
representative=der Vertreter;der Abgeordnete=P=n
edition=die Ausgabe;die Auflage=-=n
appeal=der Appell;ansprechen;die Berufung=-=n
respond=antworten;reagieren=-=v
flower=die Blume=N=n
prison=das Gefängnis=P=n
strength=die Stärke;die Kraft=-=n
encourage=ermutigen=-=v
restaurant=das Restaurant=E=n
actor=der Schauspieler=F=n
yard=der Hof;der Garten=A=n
healthy=gesund=K=a
appreciate=schätzen;zu schätzen wissen=-=v
quarter=das Viertel;das Quartal=Z=n
expert=der Experte;die Expertin=-=n
secure=sicher;sichern=-=a
bottom=der Boden;das Unterteil;der Po=-=n
famous=berühmt=-=a
sad=traurig=O=a
southern=südlich=R=a
traditional=traditionell=-=a
twice=zweimal=Z=d
boat=das Boot=R=n
celebrate=feiern=F=v
honor|honour=die Ehre;ehren=-=n
stress=der Stress;betonen=O=n
object=der Gegenstand;das Objekt=-=n
manage=schaffen;leiten;verwalten=-=v
fix=reparieren;befestigen=A=v
institute=das Institut=S=n
border=die Grenze=P=n
wing=der Flügel=N=n
hole=das Loch=-=n
suffer=leiden=-=v
hire=einstellen;mieten=G=v
assume=annehmen;vermuten=-=v
corner=die Ecke=-=n
resident=der Bewohner;der Einwohner=R=n
critical=kritisch=-=a
digital=digital=T=a
fourth=vierte;vierter;viertes=Z=a
fresh=frisch=E=a
mental=geistig;psychisch=K=a
mostly=meistens;hauptsächlich=-=d
previously=vorher;zuvor=Z=d
totally=total;völlig=-=d
edge=der Rand;die Kante=-=n
journal=die Zeitschrift;das Tagebuch=T=n
length=die Länge=Z=n
relation=die Beziehung;das Verhältnis=-=n
plane;airplane=das Flugzeug=R=n
rank=der Rang;einstufen=-=n
affair=die Angelegenheit;die Affäre=-=n
magazine=die Zeitschrift;das Magazin=T=n
apple=der Apfel=E=n
exercise=die Übung;trainieren=S=n
fee=die Gebühr=G=n
faith=der Glaube;das Vertrauen=P=n
understanding=das Verständnis=-=n
accident=der Unfall;der Zufall=R=n
zone=die Zone;der Bereich=-=n
boss=der Chef;die Chefin=S=n
shut=schließen;zumachen=-=v
pair=das Paar=-=n
desire=der Wunsch;das Verlangen;wünschen=O=n
port=der Hafen;der Anschluss=R=n
email=die E-Mail;mailen=T=n
variety=die Vielfalt;die Auswahl=-=n
argument=der Streit;das Argument=-=n
temperature=die Temperatur=N=n
background=der Hintergrund=-=n
attend=besuchen;teilnehmen=S=v
capture=fangen;erfassen;erobern=-=v
survive=überleben=-=v
basis=die Grundlage;die Basis=-=n
Japanese=japanisch=-=a
silver=das Silber;silbern=N=n
weird=seltsam;komisch;merkwürdig=-=a
obtain=erhalten;erlangen=-=v
guest=der Gast=F=n
audience=das Publikum;die Zuschauer=F=n
mix=mischen;die Mischung=-=v
shoe=der Schuh=A=n
escape=fliehen;entkommen;die Flucht=-=v
net=das Netz;netto=-=n
advance=der Fortschritt;vorrücken=-=n
contribute=beitragen=-=v
balance=das Gleichgewicht;der Kontostand=-=n
sentence=der Satz;das Urteil=S=n
inspire=inspirieren;begeistern=-=v
survey=die Umfrage;untersuchen=-=n
witness=der Zeuge;bezeugen=P=n
tough=hart;zäh;schwierig=-=a
rain=der Regen;regnen=N=n
religion=die Religion=P=n
apparently=anscheinend;offenbar=-=d
engineering=die Technik;der Maschinenbau=T=n
Monday=der Montag=Z=n
obviously=offensichtlich=-=d
somebody=jemand=-=x
wild=wild=N=a
deny=leugnen;bestreiten;verweigern=-=v
client=der Kunde;der Mandant=G=n
shoot=schießen;drehen=-=v
belong=gehören=-=v
warm=warm=N=a
engineer=der Ingenieur;die Ingenieurin=T=n
alternative=die Alternative;alternativ=-=n
platform=die Plattform;der Bahnsteig=T=n
route=die Route;der Weg=R=n
holiday=der Urlaub;der Feiertag;die Ferien=F=n
failure=das Versagen;der Misserfolg;der Ausfall=-=n
giant=riesig;der Riese=-=a
description=die Beschreibung=-=n
pattern=das Muster=-=n
requirement=die Anforderung;die Voraussetzung=-=n
technique=die Technik;das Verfahren=-=n
path=der Pfad;der Weg=R=n
forest=der Wald=N=n
finger=der Finger=K=n
kiss=küssen;der Kuss=O=v
task=die Aufgabe=S=n
cast=werfen;die Besetzung=-=v
dangerous=gefährlich=-=a
extremely=äußerst;extrem=-=d
indeed=tatsächlich;in der Tat=-=d
negative=negativ=-=a
television=das Fernsehen;der Fernseher=T=n
till=bis;die Kasse=Z=x
graduate=den Abschluss machen;der Absolvent=S=v
prepare=vorbereiten;zubereiten=-=v
lift=heben;der Aufzug=-=v
wine=der Wein=E=n
appearance=das Aussehen;das Auftreten=-=n
hang=hängen;aufhängen=-=v
cycle=der Kreislauf;Rad fahren=-=n
defend=verteidigen=-=v
crash=der Unfall;der Absturz;abstürzen=R=n
signal=das Signal;das Zeichen=T=n
deserve=verdienen=-=v
consumer=der Verbraucher=G=n
sky=der Himmel=N=n
abuse=der Missbrauch;missbrauchen=-=n
switch=der Schalter;wechseln;umschalten=T=n
dry=trocken;trocknen=-=a
victory=der Sieg=F=n
classic=klassisch;der Klassiker=-=a
egg=das Ei=E=n
apart=auseinander;getrennt=-=d
aware=bewusst=-=a
dinner=das Abendessen=E=n
eastern=östlich=R=a
fifth=fünfte;fünfter;fünftes=Z=a
herself=sich;sich selbst;sie selbst=-=x
impossible=unmöglich=-=a
progress=der Fortschritt=-=n
proud=stolz=O=a
van=der Lieferwagen;der Transporter=R=n
remind=erinnern=-=v
ensure=sicherstellen;sorgen für=-=v
paint=malen;streichen;die Farbe=F=v
shock=der Schock;schockieren=O=n
surround=umgeben=-=v
festival=das Festival;das Fest=F=n
ignore=ignorieren=-=v
ray=der Strahl=N=n
download=herunterladen=T=v
reply=antworten;die Antwort=-=v
medicine=die Medizin;das Medikament=K=n
bowl=die Schüssel=A=n
chair=der Stuhl=A=n
truck|lorry=der Lastwagen;der LKW=R=n
manufacture=herstellen=G=v
shirt=das Hemd=A=n
liberal=liberal=P=a
fuel=der Kraftstoff;der Brennstoff=R=n
planet=der Planet=N=n
entry=der Eintrag;der Eintritt=-=n
museum=das Museum=F=n
invite=einladen=-=v
edit=bearbeiten=T=v
birth=die Geburt=M=n
dear=lieb;teuer=O=a
housing=die Wohnung;das Wohnen=A=n
labor|labour=die Arbeit=S=n
leadership=die Führung=-=n
lucky=glücklich;Glücks-=O=a
neither=keiner;weder=-=x
onto=auf=-=x
possibly=möglicherweise=-=d
rare=selten=-=a
software=die Software=T=n
threat=die Drohung;die Bedrohung=-=n
debt=die Schulden=G=n
declare=erklären;verkünden=-=v
flat=flach;die Wohnung;platt=-=a
studio=das Studio;das Atelier=F=n
teaching=der Unterricht;das Lehren=S=n
blame=beschuldigen;die Schuld=-=v
beer=das Bier=E=n
debate=die Debatte;debattieren=P=n
determine=bestimmen;feststellen=-=v
joint=gemeinsam;das Gelenk=-=a
crew=die Besatzung;die Mannschaft=-=n
chain=die Kette=-=n
category=die Kategorie=-=n
newspaper=die Zeitung=T=n
crowd=die Menge;die Menschenmenge=M=n
alive=lebendig;am Leben=-=a
birthday=der Geburtstag=F=n
magic=die Magie;magisch;der Zauber=-=n
prince=der Prinz=P=n
sector=der Sektor;der Bereich=G=n
chapter=das Kapitel=S=n
aspect=der Aspekt=-=n
assistant=der Assistent;die Assistentin=S=n
theme=das Thema=-=n
shift=die Schicht;verschieben=S=n
behavior|behaviour=das Verhalten=-=n
reserve=reservieren;die Reserve=-=v
conflict=der Konflikt=P=n
expand=erweitern;ausdehnen=-=v
beauty=die Schönheit=-=n
billion=die Milliarde=Z=n
busy=beschäftigt;besetzt=-=a
concerned=besorgt;betroffen=O=a
cultural=kulturell=F=a
frank=offen;ehrlich=-=a
Mexico=Mexiko=R=n
slightly=etwas;leicht=-=d
technical=technisch=T=a
unique=einzigartig=-=a
violence=die Gewalt=P=n
yours=deins;deiner;deine;Ihres=-=x
youth=die Jugend=M=n
frame=der Rahmen=-=n
scare=erschrecken;Angst machen=O=v
grab=packen;schnappen=-=v
tend=neigen;dazu neigen=-=v
ocean=der Ozean=N=n
tank=der Tank;der Panzer=-=n
sample=die Probe;das Muster=-=n
assist=helfen;unterstützen=-=v
approve=genehmigen;billigen=-=v
regulation=die Vorschrift;die Regelung=P=n
painting=das Gemälde;die Malerei=F=n
folk=die Leute;das Volk=M=n
transport=der Transport;befördern=R=n
novel=der Roman;neuartig=F=n
suspect=der Verdächtige;vermuten=P=n
smoke=der Rauch;rauchen=-=n
evil=böse;das Böse=-=a
excited=aufgeregt;begeistert=O=a
forever=für immer;ewig=Z=d
iron=das Eisen;bügeln=A=n
lovely=schön;reizend;herrlich=O=a
mad=verrückt;sauer=O=a
parliament=das Parlament=P=n
prepared=bereit;vorbereitet=-=a
somewhere=irgendwo=-=d
web=das Netz;das Web=T=n
apartment=die Wohnung=A=n
stream=der Bach;streamen;der Strom=N=n
pound=das Pfund=G=n
conservative=konservativ=P=a
ruin=ruinieren;die Ruine=-=v
storm=der Sturm;das Gewitter=N=n
native=einheimisch;Mutter-=-=a
pool=das Schwimmbecken;der Pool=F=n
branch=der Ast;die Filiale;der Zweig=N=n
mess=das Durcheinander;die Unordnung=A=n
adopt=adoptieren;übernehmen=-=v
bomb=die Bombe=P=n
guarantee=garantieren;die Garantie=G=v
bay=die Bucht=N=n
blog=der Blog=T=n
closer=näher=-=a
core=der Kern=-=n
democratic=demokratisch=P=a
excellent=ausgezeichnet;hervorragend=-=a
honest=ehrlich=O=a
nuclear=Atom-;nuklear=T=a
presence=die Anwesenheit;die Gegenwart=-=n
solid=fest;solide=-=a
Spanish=spanisch;das Spanisch=S=a
tea=der Tee=E=n
consist=bestehen=-=v
lesson=die Unterrichtsstunde;die Lektion=S=n
weak=schwach=-=a
elect=wählen=P=v
draft=der Entwurf;entwerfen=-=n
affect=beeinflussen;betreffen=-=v
error=der Fehler=T=n
trend=der Trend=-=n
inch=der Zoll=Z=n
talent=das Talent;die Begabung=-=n
admit=zugeben;einlassen=-=v
generate=erzeugen=-=v
threaten=drohen;bedrohen=-=v
bottle=die Flasche=E=n
editor=der Redakteur;der Herausgeber=T=n
girlfriend=die Freundin=M=n
afternoon=der Nachmittag=Z=n
Britain=Großbritannien=R=n
clothes=die Kleidung;die Klamotten=A=n
electric=elektrisch=T=a
emergency=der Notfall=K=n
entirely=völlig;ganz=-=d
hello=hallo=-=x
ill=krank=K=a
mail=die Post;schicken=-=n
massive=massiv;riesig=-=a
plenty=reichlich;viel=-=x
proper=richtig;ordentlich=-=a
regional=regional=R=a
upper=obere;oberer;oberes=-=a
useful=nützlich=-=a
valley=das Tal=N=n
willing=bereit;gewillt=-=a
defeat=besiegen;die Niederlage=F=v
plate=der Teller;das Schild=A=n
chemical=chemisch;die Chemikalie=S=a
mode=der Modus=T=n
crack=der Riss;knacken=-=n
advanced=fortgeschritten=-=a
anywhere=irgendwo;überall=-=d
capacity=die Kapazität;das Fassungsvermögen=-=n
climate=das Klima=N=n
fantastic=fantastisch=O=a
industrial=industriell=G=a
steel=der Stahl=N=n
terrible=schrecklich;furchtbar=O=a
tired=müde=K=a
organize|organise=organisieren=-=v
cap=die Mütze;die Kappe;der Deckel=A=n
possibility=die Möglichkeit=-=n
identity=die Identität=-=n
phase=die Phase=-=n
delay=die Verspätung;verzögern=R=n
bone=der Knochen=K=n
flag=die Flagge;die Fahne=P=n
territory=das Gebiet;das Territorium=P=n
equal=gleich;gleichberechtigt=-=a
afraid=ängstlich;besorgt=O=a
Canadian=kanadisch=-=a
environmental=Umwelt-;ökologisch=N=a
fixed=fest;festgelegt=-=a
intelligence=die Intelligenz;der Geheimdienst=-=n
moon=der Mond=N=n
proof=der Beweis=-=n
tooth=der Zahn=K=n
wound=die Wunde=K=n
ear=das Ohr=K=n
protest=der Protest;protestieren=P=n
finance=die Finanzen;finanzieren=G=n
improvement=die Verbesserung=-=n
topic=das Thema=S=n
gate=das Tor;das Gate=-=n
wheel=das Rad;das Lenkrad=R=n
producer=der Produzent;der Hersteller=G=n
chicken=das Huhn;das Hähnchen=E=n
invest=investieren=G=v
politician=der Politiker;die Politikerin=P=n
prize=der Preis;der Gewinn=F=n
Asian=asiatisch=-=a
domestic=häuslich;inländisch=-=a
expensive=teuer=G=a
historical=historisch;geschichtlich=S=a
honestly=ehrlich gesagt;ehrlich=-=d
minimum=das Minimum;mindestens=Z=n
originally=ursprünglich=-=d
suddenly=plötzlich=Z=d
supreme=höchste;oberste=-=a
yellow=gelb=-=a
drawing=die Zeichnung=F=n
circle=der Kreis=-=n
fruit=das Obst;die Frucht=E=n
incident=der Vorfall=-=n
license|licence=die Lizenz;der Führerschein=-=n
rush=eilen;hetzen;die Eile=-=v
fault=die Schuld;der Fehler=-=n
vision=die Vision;das Sehvermögen=-=n
component=das Bauteil;der Bestandteil=T=n
scream=schreien;der Schrei=O=v
speaker=der Sprecher;der Redner;der Lautsprecher=-=n
ton=die Tonne=Z=n
attitude=die Einstellung;die Haltung=O=n
principle=das Prinzip;der Grundsatz=-=n
solve=lösen=S=v
decline=ablehnen;sinken;der Rückgang=-=v
expose=aussetzen;aufdecken=-=v
ancient=antik;uralt=-=a
ending=das Ende;der Schluss=-=n
illegal=illegal;verboten=P=a
Scotland=Schottland=R=n
shopping=das Einkaufen;der Einkauf=G=n
soft=weich=-=a
stuck=stecken geblieben;festgefahren=-=a
sugar=der Zucker=E=n
scientist=der Wissenschaftler;die Wissenschaftlerin=S=n
highlight=der Höhepunkt;hervorheben=-=n
height=die Höhe;die Größe=Z=n
mount=steigen;anbringen;der Berg=-=v
reader=der Leser;die Leserin=F=n
root=die Wurzel=N=n
combination=die Kombination=-=n
knock=klopfen;stoßen=-=v
row=die Reihe;rudern=-=n
label=das Etikett;beschriften=-=n
bell=die Glocke;die Klingel=A=n
appropriate=angemessen;passend=-=a
drama=das Drama=F=n
era=die Ära;das Zeitalter=Z=n
golden=golden=-=a
scientific=wissenschaftlich=S=a
squad=die Mannschaft;der Kader=F=n
publication=die Veröffentlichung=T=n
shoulder=die Schulter=K=n
danger=die Gefahr=-=n
minor=gering;klein;der Minderjährige=-=a
belief=der Glaube;die Überzeugung=-=n
lane=die Gasse;die Spur=R=n
origin=die Herkunft;der Ursprung=-=n
protein=das Eiweiß;das Protein=E=n
selection=die Auswahl=-=n
angel=der Engel=-=n
pilot=der Pilot;die Pilotin=R=n
investigate=untersuchen;ermitteln=-=v
chase=jagen;verfolgen=-=v
employ=beschäftigen;einstellen=S=v
bright=hell;leuchtend;klug=-=a
relative=der Verwandte;relativ=M=n
rating=die Bewertung=-=n
reflect=widerspiegeln;nachdenken=-=v
passenger=der Fahrgast;der Passagier=R=n
button=der Knopf;die Taste=T=n
angry=wütend;verärgert=O=a
comfortable=bequem;gemütlich=A=a
emotional=emotional;gefühlvoll=O=a
everywhere=überall=-=d
fox=der Fuchs=N=n
internal=intern;innere=-=a
Ireland=Irland=R=n
Italian=italienisch=-=a
Italy=Italien=R=n
lunch=das Mittagessen=E=n
milk=die Milch=E=n
relatively=relativ;verhältnismäßig=-=d
snow=der Schnee;schneien=N=n
monster=das Monster;das Ungeheuer=-=n
meal=die Mahlzeit;das Essen=E=n
rent=mieten;die Miete=A=v
championship=die Meisterschaft=F=n
reform=die Reform;reformieren=P=n
demonstrate=zeigen;vorführen;demonstrieren=-=v
proposal=der Vorschlag;der Heiratsantrag=-=n
wage=der Lohn=G=n
mate=der Kumpel;der Partner=M=n
connect=verbinden=T=v
excuse=die Entschuldigung;die Ausrede;entschuldigen=-=n
warning=die Warnung=-=n
concert=das Konzert=F=n
contest=der Wettbewerb=F=n
Asia=Asien=R=n
confidence=das Selbstvertrauen;das Vertrauen=O=n
cute=süß;niedlich=-=a
fake=gefälscht;falsch;die Fälschung=-=a
journey=die Reise;die Fahrt=R=n
kitchen=die Küche=A=n
Korea=Korea=R=n
numerous=zahlreich=-=a
quiet=leise;ruhig;still=-=a
specifically=speziell;ausdrücklich=-=d
split=teilen;spalten=-=v
twenty=zwanzig=Z=x
urban=städtisch=R=a
definition=die Definition=S=n
motor=der Motor=R=n
battery=die Batterie;der Akku=T=n
shake=schütteln;zittern=-=v
factory=die Fabrik=G=n
trick=der Trick;austricksen=-=n
recover=sich erholen;wiedererlangen=K=v
tradition=die Tradition;der Brauch=F=n
photograph=das Foto;fotografieren=F=n
broad=breit;weit=-=a
hat=der Hut=A=n
perspective=die Perspektive;die Sichtweise=-=n
install=installieren;einbauen=T=v
chart=das Diagramm;die Tabelle;die Charts=-=n
appoint=ernennen=-=v
resolution=die Auflösung;der Vorsatz;der Beschluss=-=n
plot=die Handlung;das Grundstück=F=n
expression=der Ausdruck=S=n
contribution=der Beitrag=-=n
aircraft=das Flugzeug=R=n
approximately=ungefähr;etwa=Z=d
determined=entschlossen=-=a
distribution=die Verteilung;der Vertrieb=G=n
friendly=freundlich=O=a
mixed=gemischt=-=a
properly=richtig;ordentlich=-=d
pure=rein;pur=-=a
strange=seltsam;fremd=-=a
repair=reparieren;die Reparatur=A=v
favor|favour=der Gefallen;bevorzugen=-=n
journalist=der Journalist;die Journalistin=T=n
circumstance=der Umstand=-=n
delivery=die Lieferung;die Zustellung=G=n
portion=die Portion;der Anteil=E=n
personality=die Persönlichkeit=O=n
cloud=die Wolke=N=n
heaven=der Himmel=-=n
academic=akademisch;wissenschaftlich=S=a
tournament=das Turnier=F=n
chat=plaudern;chatten;der Plausch=T=v
household=der Haushalt=A=n
adventure=das Abenteuer=F=n
basically=im Grunde;eigentlich=-=d
besides=außerdem;neben=-=x
context=der Zusammenhang;der Kontext=-=n
coverage=die Berichterstattung;die Abdeckung=T=n
false=falsch=-=a
funding=die Finanzierung;die Förderung=G=n
incredible=unglaublich=O=a
meat=das Fleisch=E=n
ministry=das Ministerium=P=n
neck=der Hals;der Nacken=K=n
obvious=offensichtlich=-=a
stadium=das Stadion=F=n
surgery=die Operation;die Chirurgie=K=n
Tuesday=der Dienstag=Z=n
whenever=wann immer;immer wenn=Z=x
slowly=langsam=-=d
worried=besorgt=O=a
zero=null=Z=x
extend=verlängern;erweitern=-=v
trap=die Falle;fangen=-=n
seed=der Samen=N=n
custom=der Brauch;maßgeschneidert=-=n
manner=die Art;die Weise;die Manieren=-=n
marine=Meeres-;der Marinesoldat=N=a
pocket=die Tasche;die Hosentasche=A=n
occasion=der Anlass;die Gelegenheit=-=n
cable=das Kabel=T=n
tower=der Turm=R=n
stretch=dehnen;strecken;die Strecke=K=v
smell=riechen;der Geruch=K=v
prefer=bevorzugen;lieber mögen=-=v
diet=die Ernährung;die Diät=E=n
poll=die Umfrage=P=n
cream=die Sahne;die Creme=E=n
crisis=die Krise=P=n
jail=das Gefängnis=P=n
kingdom=das Königreich=P=n
literature=die Literatur=S=n
mayor=der Bürgermeister;die Bürgermeisterin=P=n
opposite=gegenüber;das Gegenteil=-=a
orange=orange;die Orange=E=a
ourselves=uns;uns selbst=-=x
Thursday=der Donnerstag=Z=n
tiny=winzig=-=a
typically=typischerweise=-=d
unfortunately=leider=-=d
usual=üblich;gewöhnlich=-=a
voter=der Wähler;die Wählerin=P=n
bike;bicycle=das Fahrrad;das Rad=R=n
sight=die Sicht;der Anblick;die Sehenswürdigkeit=-=n
observe=beobachten=-=v
enable=ermöglichen=-=v
depth=die Tiefe=-=n
wash=waschen=A=v
found=gründen=-=v
peak=der Gipfel;die Spitze=N=n
muscle=der Muskel=K=n
consequence=die Folge;die Konsequenz=-=n
noise=der Lärm;das Geräusch=-=n
visitor=der Besucher;die Besucherin=R=n
comic=der Comic;komisch=F=n
compete=konkurrieren;antreten=F=v
attract=anziehen=-=v
farmer=der Bauer;der Landwirt=N=n
cake=der Kuchen=E=n
implement=umsetzen;durchführen=-=v
tag=das Etikett;markieren=-=n
alcohol=der Alkohol=E=n
breakfast=das Frühstück=E=n
capable=fähig=-=a
essential=wesentlich;unverzichtbar=-=a
familiar=vertraut;bekannt=-=a
guilty=schuldig=P=a
perfectly=perfekt;völlig=-=d
relevant=relevant;wichtig=-=a
unable=unfähig;nicht in der Lage=-=a
upset=verärgert;aufgebracht;durcheinander=O=a
loud=laut=-=a
supporter=der Anhänger;der Unterstützer=F=n
reward=die Belohnung;belohnen=-=n
recording=die Aufnahme=T=n
swear=schwören;fluchen=-=v
wire=der Draht=T=n
seal=die Robbe;versiegeln;das Siegel=N=n
relate=sich beziehen;erzählen=-=v
province=die Provinz=P=n
penalty=die Strafe;der Elfmeter=F=n
pet=das Haustier=N=n
saint=der Heilige=-=n
neighborhood|neighbourhood=die Nachbarschaft;das Viertel=R=n
server=der Server=T=n
submit=einreichen;abgeben=S=v
complain=sich beschweren;klagen=-=v
layer=die Schicht=-=n
explore=erkunden;erforschen=-=v
appointment=der Termin;die Ernennung=-=n
experiment=das Experiment;der Versuch=S=n
creative=kreativ=-=a
educational=pädagogisch;lehrreich=S=a
entertainment=die Unterhaltung=F=n
extreme=extrem=-=a
mainly=hauptsächlich=-=d
maximum=das Maximum;höchstens=Z=n
republic=die Republik=P=n
salt=das Salz=E=n
statistic=die Statistik=S=n
quit=aufhören;kündigen=-=v
encounter=begegnen;die Begegnung=-=v
cancel=absagen;stornieren=-=v
sheet=das Blatt;das Laken=A=n
singer=der Sänger;die Sängerin=F=n
pray=beten=-=v
prayer=das Gebet=-=n
pitch=das Spielfeld;die Tonhöhe;werfen=F=n
bathroom=das Badezimmer;das Bad=A=n
shower=die Dusche;duschen=A=n
recall=sich erinnern;zurückrufen=-=v
legend=die Legende;die Sage=-=n
prisoner=der Gefangene=P=n
instrument=das Instrument=F=n
rely=sich verlassen=-=v
settlement=die Siedlung;die Einigung=-=n
package=das Paket=-=n
shadow=der Schatten=N=n
bid=das Gebot;bieten=G=n
rescue=retten;die Rettung=-=v
armed=bewaffnet=P=a
aside=beiseite=-=d
assistance=die Hilfe;die Unterstützung=-=n
boyfriend=der Freund=M=n
careful=vorsichtig;sorgfältig=-=a
empty=leer;leeren=-=a
gender=das Geschlecht=M=n
motion=die Bewegung;der Antrag=-=n
reasonable=vernünftig;angemessen=-=a
register=registrieren;anmelden=-=v
rural=ländlich=R=a
Spain=Spanien=R=n
typical=typisch=-=a
universe=das Universum;das Weltall=N=n
Wednesday=der Mittwoch=Z=n
nurse=die Krankenschwester;der Krankenpfleger=K=n
emotion=das Gefühl;die Emotion=O=n
permit=erlauben;die Genehmigung=-=v
reject=ablehnen;zurückweisen=-=v
manufacturer=der Hersteller=G=n
volunteer=der Freiwillige;sich freiwillig melden=-=n
comparison=der Vergleich=-=n
collect=sammeln;abholen=-=v
pump=die Pumpe;pumpen=-=n
highway=die Autobahn;die Landstraße=R=n
tall=groß;hoch=-=a
expense=die Ausgabe;die Kosten=G=n
dragon=der Drache=-=n
spin=drehen;die Drehung=-=v
terrorist=der Terrorist=P=n
veteran=der Veteran=P=n
Brazil=Brasilien=R=n
independence=die Unabhängigkeit=P=n
random=zufällig=-=a
recovery=die Erholung;die Genesung=K=n
complaint=die Beschwerde=-=n
repeat=wiederholen=S=v
toy=das Spielzeug=F=n
emerge=auftauchen;entstehen=-=v
killer=der Mörder;der Killer=P=n
difficulty=die Schwierigkeit=-=n
designer=der Designer;der Gestalter=-=n
tune=die Melodie;stimmen=F=n
expectation=die Erwartung=-=n
academy=die Akademie=S=n
accurate=genau;exakt=-=a
afford=sich leisten=G=v
bunch=der Haufen;der Strauß;das Bündel=-=n
cheese=der Käse=E=n
competitive=wettbewerbsfähig;ehrgeizig=-=a
navy=die Marine=P=n
normally=normalerweise=-=d
opposition=die Opposition;der Widerstand=P=n
permanent=dauerhaft;ständig=-=a
personally=persönlich=-=d
pleasure=das Vergnügen;die Freude=O=n
storage=die Lagerung;der Speicher=T=n
tight=eng;fest=-=a
transportation=der Transport;die Beförderung=R=n
ultimately=letztendlich=-=d
unlike=anders als;im Gegensatz zu=-=x
weekly=wöchentlich=Z=a
priority=die Priorität;der Vorrang=-=n
instruction=die Anweisung;die Anleitung=S=n
fighter=der Kämpfer=-=n
strip=der Streifen;ausziehen=-=n
gang=die Bande;die Gang=P=n
punch=schlagen;der Schlag=-=v
boot=der Stiefel;der Kofferraum;hochfahren=A=n
climb=klettern;steigen=F=v
partnership=die Partnerschaft=-=n
diamond=der Diamant=N=n
gap=die Lücke=-=n
gene=das Gen=N=n
tone=der Ton=-=n
chip=der Chip;der Splitter=T=n
trail=der Pfad;die Spur=N=n
participate=teilnehmen=-=v
knee=das Knie=K=n
engage=sich beschäftigen;einbinden=-=v
basketball=der Basketball=F=n
combat=der Kampf;bekämpfen=P=n
constitution=die Verfassung=P=n
counter=der Schalter;die Theke;der Zähler=-=n
creation=die Schöpfung;die Erschaffung=-=n
crown=die Krone=P=n
depression=die Depression;die Senke=K=n
employment=die Beschäftigung;die Anstellung=S=n
exclusive=exklusiv=-=a
frequently=häufig;oft=Z=d
golf=das Golf=F=n
grace=die Anmut;die Gnade=-=n
hopefully=hoffentlich=-=d
importance=die Bedeutung;die Wichtigkeit=-=n
personnel=das Personal=S=n
pregnant=schwanger=K=a
revolution=die Revolution=P=n
severe=schwer;streng;heftig=-=a
suppose=annehmen;vermuten=-=v
turkey=der Truthahn;die Pute=E=n
spell=buchstabieren;der Zauber=S=v
sponsor=der Sponsor;sponsern=G=n
drag=ziehen;schleppen=-=v
string=die Schnur;die Saite=-=n
conclude=schließen;folgern=-=v
twin=der Zwilling=M=n
gather=sammeln;sich versammeln=-=v
mirror=der Spiegel=A=n
slave=der Sklave=P=n
dozen=das Dutzend=Z=n
lip=die Lippe=K=n
teen;teenager=der Teenager;der Jugendliche=M=n
railway;railroad=die Eisenbahn=R=n
vary=variieren;sich unterscheiden=-=v
monitor=der Monitor;überwachen=T=n
log=das Protokoll;der Baumstamm;sich anmelden=T=n
abandon=verlassen;aufgeben=-=v
founder=der Gründer;die Gründerin=G=n
brilliant=brillant;glänzend=-=a
carbon=der Kohlenstoff=N=n
dirty=schmutzig;dreckig=A=a
electronic=elektronisch=T=a
existence=die Existenz;das Dasein=-=n
interior=das Innere;innen=-=n
joy=die Freude=O=n
maintenance=die Wartung;die Instandhaltung=-=n
nearby=in der Nähe;nahe gelegen=-=a
relief=die Erleichterung;die Hilfe=O=n
resistance=der Widerstand=-=n
rice=der Reis=E=n
roof=das Dach=A=n
shame=die Scham;die Schande;schade=O=n
somewhat=etwas;ziemlich=-=d
surely=sicherlich;bestimmt=-=d
criticism=die Kritik=-=n
extension=die Verlängerung;der Anbau=-=n
circuit=der Stromkreis;die Rennstrecke=T=n
acid=die Säure;sauer=S=n
format=das Format=T=n
cheat=schummeln;betrügen=-=v
disappear=verschwinden=-=v
examine=untersuchen;prüfen=-=v
conclusion=der Schluss;die Schlussfolgerung=S=n
pursue=verfolgen=-=v
minority=die Minderheit=P=n
idiot=der Idiot=-=n
outcome=das Ergebnis=-=n
assessment=die Bewertung;die Einschätzung=S=n
hip=die Hüfte=K=n
charity=die Wohltätigkeit;die Hilfsorganisation=P=n
objective=das Ziel;objektiv=-=n
leak=undicht sein;das Leck=-=v
athlete=der Sportler;der Athlet=F=n
arrangement=die Vereinbarung;die Anordnung=-=n
absolute=absolut;völlig=-=a
advertising=die Werbung=G=n
baseball=der Baseball=F=n
calm=ruhig;beruhigen=O=a
constant=ständig;konstant=-=a
dumb=dumm;stumm=-=a
empire=das Reich;das Imperium=P=n
exciting=spannend;aufregend=O=a
expansion=die Erweiterung;die Ausdehnung=-=n
heavily=stark;schwer=-=d
Irish=irisch=-=a
wet=nass=N=a
worldwide=weltweit=-=a
plain=einfach;schlicht;die Ebene=-=a
cousin=der Cousin;die Cousine=M=n
thread=der Faden=A=n
convert=umwandeln;bekehren=-=v
achievement=die Leistung;die Errungenschaft=-=n
immigrant=der Einwanderer=P=n
sin=die Sünde=-=n
employer=der Arbeitgeber=S=n
suggestion=der Vorschlag=-=n
bonus=der Bonus=G=n
intention=die Absicht=-=n
disorder=die Störung;die Unordnung=K=n
tape=das Klebeband;das Band=-=n
flood=die Flut;die Überschwemmung=N=n
tiger=der Tiger=N=n
bedroom=das Schlafzimmer=A=n
medal=die Medaille=F=n
annoy=ärgern;nerven=O=v
interaction=die Interaktion;die Wechselwirkung=-=n
sand=der Sand=N=n
anniversary=der Jahrestag=F=n
attractive=attraktiv;anziehend=-=a
closely=genau;eng=-=d
constantly=ständig=-=d
hardly=kaum=-=d
officially=offiziell=-=d
PC=der PC;der Computer=T=n
princess=die Prinzessin=P=n
raw=roh=E=a
retirement=der Ruhestand;die Rente=S=n
secondary=sekundär;weiterführend=-=a
solar=Solar-;Sonnen-=T=a
somehow=irgendwie=-=d
suffering=das Leiden=-=n
ultimate=ultimativ;endgültig=-=a
unknown=unbekannt=-=a
ghost=der Geist;das Gespenst=-=n
math|maths=die Mathematik;die Mathe=S=n
slip=ausrutschen;rutschen=-=v
coin=die Münze=G=n
bother=stören;belästigen=-=v
dig=graben=-=v
habit=die Gewohnheit=-=n
discovery=die Entdeckung=-=n
mystery=das Rätsel;das Geheimnis=-=n
restore=wiederherstellen=-=v
ideal=ideal;das Ideal=-=a
bat=die Fledermaus;der Schläger=N=n
gear=der Gang;die Ausrüstung=R=n
dispute=der Streit;bestreiten=-=n
sink=sinken;das Waschbecken=A=v
slide=rutschen;die Rutsche;die Folie=-=v
critic=der Kritiker=-=n
initiative=die Initiative=-=n
coat=der Mantel;die Jacke=A=n
succeed=gelingen;Erfolg haben=-=v
explanation=die Erklärung=S=n
temple=der Tempel=-=n
assault=der Angriff;angreifen=P=n
automatically=automatisch=T=d
blind=blind=K=a
breath=der Atem=K=n
brief=kurz=-=a
chest=die Brust;die Truhe=K=n
debut=das Debüt=F=n
engaged=verlobt;beschäftigt=M=a
external=extern;äußere=-=a
fantasy=die Fantasie=F=n
immediate=sofortig;unmittelbar=-=a
introduction=die Einführung;die Einleitung=S=n
pink=rosa;pink=-=a
principal=der Schulleiter;Haupt-=S=n
regularly=regelmäßig=Z=d
smoking=das Rauchen=K=n
steam=der Dampf=N=n
theatre|theater=das Theater=F=n
therapy=die Therapie=K=n
nail=der Nagel=A=n
commitment=das Engagement;die Verpflichtung=-=n
shell=die Muschel;die Schale=N=n
flash=der Blitz;blinken=-=n
pretend=so tun als ob=-=v
stranger=der Fremde=M=n
lion=der Löwe=N=n
cite=zitieren;anführen=-=v
researcher=der Forscher;die Forscherin=S=n
opponent=der Gegner=F=n
mouse=die Maus=N=n
swing=schwingen;die Schaukel=-=v
knife=das Messer=E=n
reporter=der Reporter;die Reporterin=T=n
wolf=der Wolf=N=n
preserve=bewahren;konservieren=-=v
graphic=grafisch;die Grafik=T=a
bite=beißen;der Biss=-=v
campus=der Campus;das Schulgelände=S=n
childhood=die Kindheit=M=n
clinical=klinisch=K=a
comedy=die Komödie=F=n
democracy=die Demokratie=P=n
detailed=ausführlich;detailliert=-=a
exact=genau;exakt=-=a
injured=verletzt=K=a
musical=musikalisch;das Musical=F=a
nose=die Nase=K=n
plastic=das Plastik;der Kunststoff=-=n
valuable=wertvoll=G=a
wealth=der Reichtum=G=n
wise=weise;klug=-=a
developer=der Entwickler=T=n
kit=die Ausrüstung;der Bausatz=-=n
lover=der Liebhaber=-=n
crush=zerdrücken;der Schwarm=-=v
retain=behalten=-=v
bath=das Bad;die Badewanne=A=n
hunter=der Jäger=N=n
tale=das Märchen;die Erzählung=F=n
angle=der Winkel=S=n
upgrade=aufrüsten;das Upgrade=T=v
rail=die Schiene;das Geländer=R=n
belt=der Gürtel=A=n
jet=der Jet;der Strahl=R=n
recommendation=die Empfehlung=-=n
cheer=jubeln;anfeuern=F=v
promotion=die Beförderung;die Werbung=G=n
exception=die Ausnahme=-=n
hook=der Haken=-=n
delete=löschen=T=v
ceremony=die Zeremonie;die Feier=F=n
virus=das Virus=K=n
tube=die Röhre;die U-Bahn;die Tube=R=n
approval=die Zustimmung;die Genehmigung=-=n
bread=das Brot=E=n
equivalent=gleichwertig;entsprechend=-=a
fairly=ziemlich;fair=-=d
Greek=griechisch=-=a
inner=innere;inneres=-=a
monthly=monatlich=Z=a
outstanding=hervorragend;ausstehend=-=a
permission=die Erlaubnis=-=n
rid=loswerden;befreien=-=v
Roman=römisch=S=a
visual=visuell=-=a
symbol=das Symbol=-=n
priest=der Priester;der Pfarrer=-=n
buddy=der Kumpel=M=n
celebrity=der Promi;die Berühmtheit=F=n
maker=der Hersteller=G=n
eliminate=beseitigen;ausschalten=-=v
owe=schulden=G=v
accompany=begleiten=-=v
boundary=die Grenze=-=n
bull=der Stier;der Bulle=N=n
ally=der Verbündete=P=n
crystal=der Kristall=N=n
participant=der Teilnehmer=-=n
forum=das Forum=T=n
investor=der Investor;der Anleger=G=n
reverse=umkehren;rückwärts=-=v
warn=warnen=-=v
barely=kaum=-=d
cabinet=der Schrank;das Kabinett=A=n
chocolate=die Schokolade=E=n
coal=die Kohle=N=n
contemporary=zeitgenössisch;modern=-=a
extensive=umfangreich=-=a
formation=die Bildung;die Formation=-=n
gallery=die Galerie=F=n
historic=historisch=S=a
hunt=jagen;die Jagd=N=v
initially=anfangs;zunächst=Z=d
junior=jünger;Junior-=-=a
jury=die Jury;die Geschworenen=P=n
Korean=koreanisch=-=a
Olympic=olympisch=F=a
philosophy=die Philosophie=S=n
pride=der Stolz=O=n
rough=rau;grob=-=a
universal=universell;allgemein=-=a
vast=riesig;gewaltig=-=a
praise=loben;das Lob=-=v
pot=der Topf=A=n
column=die Spalte;die Säule;die Kolumne=-=n
infection=die Infektion=K=n
marry=heiraten=M=v
poem=das Gedicht=S=n
creature=das Wesen;das Geschöpf=N=n
salary=das Gehalt=G=n
settle=sich niederlassen;beilegen=-=v
possession=der Besitz=-=n
impress=beeindrucken=-=v
arrange=arrangieren;vereinbaren;anordnen=-=v
illness=die Krankheit=K=n
knight=der Ritter;der Springer=-=n
neighbor|neighbour=der Nachbar;die Nachbarin=M=n
disaster=die Katastrophe=-=n
consistent=beständig;konsequent=-=a
grey|gray=grau=-=a
guitar=die Gitarre=F=n
heading=die Überschrift=S=n
Latin=lateinisch;das Latein=S=a
meanwhile=inzwischen;unterdessen=Z=d
naturally=natürlich=-=d
necessarily=unbedingt;notwendigerweise=-=d
percentage=der Prozentsatz;der Anteil=Z=n
practical=praktisch=-=a
regardless=trotzdem;unabhängig davon=-=d
sharp=scharf;spitz=-=a
stable=stabil;der Stall=-=a
symptom=das Symptom=K=n
temporary=vorübergehend;befristet=Z=a
alien=der Außerirdische;fremd=-=n
rocket=die Rakete=T=n
eagle=der Adler=N=n
rob=ausrauben;berauben=P=v
pin=die Nadel;die PIN;anheften=-=n
wrap=einwickeln;einpacken=-=v
sum=die Summe=Z=n
translation=die Übersetzung=S=n
export=exportieren;der Export=G=v
dish=das Gericht;die Schüssel=E=n
rip=reißen;zerreißen=-=v
pen=der Stift;der Kugelschreiber=S=n
civilian=der Zivilist;zivil=P=n
decrease=abnehmen;verringern;der Rückgang=-=v
trace=die Spur;verfolgen=-=n
audio=Audio-;der Ton=T=a
clothing=die Kleidung=A=n
complicated=kompliziert=-=a
confused=verwirrt=O=a
everyday=alltäglich;Alltags-=A=a
extent=das Ausmaß=-=n
harm=der Schaden;schaden=-=n
healthcare=die Gesundheitsversorgung=K=n
immigration=die Einwanderung=P=n
impressive=beeindruckend=-=a
loving=liebevoll=O=a
membership=die Mitgliedschaft=-=n
recognition=die Anerkennung;die Erkennung=-=n
reputation=der Ruf=-=n
shortly=kurz;bald=Z=d
strongly=stark;nachdrücklich=-=d
thin=dünn=-=a
sequence=die Abfolge;die Reihenfolge=-=n
regret=bereuen;das Bedauern=O=v
sacrifice=das Opfer;opfern=-=n
occupy=besetzen;beschäftigen=-=v
clip=der Clip;die Klammer;abschneiden=-=n
friendship=die Freundschaft=M=n
sword=das Schwert=-=n
import=importieren;der Import=G=v
assign=zuweisen;zuteilen=-=v
colleague=der Kollege;die Kollegin=S=n
construct=bauen;konstruieren=-=v
resort=das Urlaubsort;der Ferienort=R=n
essay=der Aufsatz;der Essay=S=n
commit=begehen;sich verpflichten=-=v
uniform=die Uniform=A=n
atmosphere=die Atmosphäre;die Stimmung=-=n
awful=schrecklich;furchtbar=O=a
carefully=vorsichtig;sorgfältig=-=d
contrast=der Kontrast;der Gegensatz=-=n
elsewhere=anderswo;woanders=-=d
infrastructure=die Infrastruktur=R=n
loose=locker;lose=-=a
moral=moralisch;die Moral=-=a
offensive=beleidigend;die Offensive=-=a
poverty=die Armut=G=n
processing=die Verarbeitung=T=n
qualified=qualifiziert=S=a
ridiculous=lächerlich=-=a
sensitive=empfindlich;sensibel=O=a
silence=die Stille;das Schweigen=-=n
superior=überlegen;höher;der Vorgesetzte=-=a
thick=dick=-=a
transition=der Übergang=-=n
violent=gewalttätig;heftig=P=a
recruit=anwerben;rekrutieren=-=v
satisfy=zufriedenstellen;befriedigen=-=v
discount=der Rabatt=G=n
meter|metre=der Meter;der Zähler=Z=n
characteristic=die Eigenschaft;typisch=-=n
frequency=die Häufigkeit;die Frequenz=-=n
exhibit=ausstellen;das Ausstellungsstück=F=v
preparation=die Vorbereitung=-=n
actress=die Schauspielerin=F=n
alongside=neben;zusammen mit=-=x
anxiety=die Angst;die Sorge=O=n
castle=die Burg;das Schloss=-=n
curious=neugierig=O=a
formal=förmlich;formell=-=a
formula=die Formel=S=n
hungry=hungrig=E=a
innocent=unschuldig=P=a
palace=der Palast=-=n
photography=die Fotografie=F=n
uncle=der Onkel=M=n
aunt=die Tante=M=n
exam=die Prüfung;die Klausur=S=n
silent=still;leise;stumm=-=a
unusual=ungewöhnlich=-=a
landscape=die Landschaft=N=n
mask=die Maske=-=n
phrase=der Ausdruck;die Redewendung=S=n
refugee=der Flüchtling=P=n
happiness=das Glück;die Freude=O=n
horrible=schrecklich;furchtbar=O=a
mood=die Laune;die Stimmung=O=n
pleased=erfreut;zufrieden=O=a
relax=sich entspannen;entspannen=F=v
jacket=die Jacke=A=n
tourist=der Tourist;die Touristin=R=n
translate=übersetzen=S=v
robot=der Roboter=T=n
fool=der Narr;der Dummkopf;täuschen=-=n
boring=langweilig=O=a
clock=die Uhr=A=n
confident=selbstbewusst;zuversichtlich=O=a
desk=der Schreibtisch=S=n
electricity=der Strom;die Elektrizität=T=n
helpful=hilfsbereit;hilfreich=O=a
pizza=die Pizza=E=n
romantic=romantisch=O=a
swimming=das Schwimmen=F=n
shout=schreien;rufen=-=v
recipe=das Rezept=E=n
tail=der Schwanz=N=n
nervous=nervös=O=a
ordinary=gewöhnlich;normal=-=a
rarely=selten=-=d
stomach=der Magen;der Bauch=K=n
ugly=hässlich=-=a
fry=braten;frittieren=E=v
comfort=der Trost;der Komfort;trösten=O=n
dust=der Staub=A=n
potato=die Kartoffel=E=n
butter=die Butter=E=n
desert=die Wüste=N=n
vacation=der Urlaub;die Ferien=F=n
toilet=die Toilette;das Klo=A=n
cookie|biscuit=der Keks=E=n
bake=backen=E=v
abroad=im Ausland;ins Ausland=R=d
entrance=der Eingang;der Eintritt=A=n
physics=die Physik=S=n
silly=albern;dumm=-=a
narrow=eng;schmal=-=a
snake=die Schlange=N=n
duck=die Ente=N=n
grass=das Gras;der Rasen=N=n
pig=das Schwein=N=n
spider=die Spinne=N=n
honey=der Honig;Schatz=E=n
tongue=die Zunge=K=n
juice=der Saft=E=n
vegetable=das Gemüse=E=n
homework=die Hausaufgaben;die Hausaufgabe=S=n
grandmother;grandma=die Großmutter;die Oma=M=n
grandfather;grandpa=der Großvater;der Opa=M=n
sandwich=das Sandwich;das belegte Brot=E=n
banana=die Banane=E=n
keyboard=die Tastatur;das Keyboard=T=n
`;
