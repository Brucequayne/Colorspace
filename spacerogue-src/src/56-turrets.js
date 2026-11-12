  // ===== 56-turrets.js · Turrets (v0.55): KI-gesteuerte Waffentürme für größere Schiffe =====
  // Jeder Turret sucht sich selbst ein Ziel im Schwenkbereich (±TUR.arc um seine Einbaurichtung) und in Reichweite,
  // dreht seinen Kopf mit Vorhalt dorthin und feuert, sobald er genau genug ausgerichtet ist.
  // Werte wie die normale Waffe (MG, GUN, RG), aber doppelter Energieverbrauch (TUR.eK).
  // Minigun-Turret: gleiche Hitze und Sperre wie die Minigun, setzt aber bei TUR.stop ab und schießt erst unter TUR.go weiter.
  // Spieler-Turrets schießen auf Gegner; Gegner-Turrets nur im Kampf und nur auf dich.
  function turGeo(b) { var ty = T[b.t]; return ty.h >= 4 ? { head: 1.75, len: 2.75 } : { head: 1.45, len: 2.05 }; }   // Zellen ab der Vorderkante
  function turPivot(bd, b) {
    var ty = T[b.t], f = fp(b), d = dirOut(b, 0), g = turGeo(b), o = ty.h / 2 - g.head;
    return toWorld(bd, b.x + f[0] / 2 + DV[d][0] * o, b.y + f[1] / 2 + DV[d][1] * o);
  }
  function turDir(bd, b) { var d = dirWorld(bd, dirOut(b, 0)), a = b.tw || 0, ca = Math.cos(a), sa = Math.sin(a); return { x: d.x * ca - d.y * sa, y: d.x * sa + d.y * ca }; }
  function turTip(bd, b) { var p = turPivot(bd, b), d = turDir(bd, b), L = turGeo(b).len * CELL_M; return { x: p.x + d.x * L, y: p.y + d.y * L }; }
  // Vorhaltepunkt: wo das Ziel ist, wenn das Geschoss ankommt (Geschosse erben das Tempo des eigenen Schiffs)
  function turLead(bd, p, tg, speed) {
    var rx = tg.x - p.x, ry = tg.y - p.y, vx = tg.vx - bd.vx, vy = tg.vy - bd.vy, s2 = speed * speed;
    var a = vx * vx + vy * vy - s2, bb = 2 * (rx * vx + ry * vy), c2 = rx * rx + ry * ry, tt;
    if (Math.abs(a) < 1e-6) tt = -c2 / bb; else { var disc = bb * bb - 4 * a * c2; if (disc < 0) return null; var sq = Math.sqrt(disc), t1 = (-bb - sq) / (2 * a), t2 = (-bb + sq) / (2 * a); tt = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2); }
    if (!(tt > 0)) return null;
    return { x: tg.x + vx * tt, y: tg.y + vy * tt };
  }
  function turTargets(bd) {
    if (bd.enemy) { var me = FL.me; return bd.ai && bd.ai.state === "combat" && FL.bodies.indexOf(me) >= 0 && me.blocks.length ? [me] : []; }
    if (bd !== FL.me) return [];
    return FL.bodies.filter(function (o) { return (o.enemy || o.target) && !o.dead && o.blocks.length; });   // auch die Übungsziele im Testflug
  }
  // b.tn zählt die Schüsse eines Turrets (für Tests und spätere Statistik)
  function turretsAuto(bd, dt) {
    if (bd.dead || !bd.blocks.some(function (b) { return T[b.t].kind === "tur"; })) return;
    var tgs = turTargets(bd), pl = bd === FL.me;
    bd.blocks.forEach(function (b) {
      var ty = T[b.t]; if (ty.kind !== "tur") return;
      var w = ty.tw, p = turPivot(bd, b), mount = dirWorld(bd, dirOut(b, 0)), ma = Math.atan2(mount.y, mount.x), R = turRange(w) * TUR.rk;
      // Ziel: das nächste, das im Schwenkbereich und in Reichweite liegt
      var best = null, bestD = 1e18, bestA = 0;
      tgs.forEach(function (tg) {
        var d0 = Math.hypot(tg.x - p.x, tg.y - p.y); if (d0 > R + tg.rad * 0.5) return;
        var aimP = w === "rg" ? tg : turLead(bd, p, tg, w === "mg" ? MG.speed : GUN[w].speed); if (!aimP) return;
        var da = angDiff(Math.atan2(aimP.y - p.y, aimP.x - p.x), ma);
        if (Math.abs(da) > TUR.arc + TUR.tol[w]) return;
        if (d0 < bestD) { bestD = d0; best = tg; bestA = da; }
      });
      var want = best ? Math.max(-TUR.arc, Math.min(TUR.arc, bestA)) : 0, cur = b.tw || 0, st = TUR.rate * dt;
      b.tw = cur + Math.max(-st, Math.min(st, want - cur));
      b.tgt = best;
      var aligned = !!best && Math.abs(bestA - b.tw) < TUR.tol[w];
      if (w === "mg") {
        // Hitze-Disziplin: kurz vor der Überhitzung absetzen, erst nach dem Abkühlen weiter
        if ((b.heat || 0) >= TUR.stop) b.trest = true; else if ((b.heat || 0) <= TUR.go) b.trest = false;
        if (!aligned || b.trest || b.oh > 0) return;
        b.firing = true; b.cool2 = (b.cool2 || 0) - dt;
        if (b.cool2 > 0 || bd.energy < MG.e * TUR.eK) return;
        b.cool2 = 1 / (MG.rate * (pl ? 1 + PM.mgRate : 1)); bd.energy -= MG.e * TUR.eK; b.tn = (b.tn || 0) + 1;
        var d = turDir(bd, b), tip = turTip(bd, b);
        FL.shots.push({ x: tip.x, y: tip.y, vx: bd.vx + d.x * MG.speed + (Math.random() - 0.5) * 6, vy: bd.vy + d.y * MG.speed + (Math.random() - 0.5) * 6, life: 0, own: bd });
        FL.parts.push({ x: tip.x, y: tip.y, vx: bd.vx, vy: bd.vy, life: 0, max: 0.06, k: "flash", sz: 1.6 });
        var cn = (bd.cool && bd.cool.get(b)) || 0;
        b.heat = (b.heat || 0) + MG.heat / (1 + 0.35 * cn) * (pl && FL.oc ? 0.75 : 1);
        if (b.heat >= 1) { b.heat = 1; b.oh = b.ohMax = MG.lock / (1 + 0.3 * cn); }   // kommt durch die Disziplin praktisch nicht vor
      } else if (GUN[w]) {
        var G = GUN[w];
        if (!aligned || b.gcd > 0 || bd.energy < G.e * TUR.eK) return;
        b.gcd = 60 / G.rpm; bd.energy -= G.e * TUR.eK; b.tn = (b.tn || 0) + 1;
        var d2 = turDir(bd, b), tip2 = turTip(bd, b), big = w === "g120";
        FL.shots.push({ x: tip2.x, y: tip2.y, vx: bd.vx + d2.x * G.speed, vy: bd.vy + d2.y * G.speed, life: 0, own: bd, dmg: G.dmg, lmax: G.life, k: w, splash: G.splash || 0, sdmg: G.sdmg || 0 });
        FL.parts.push({ x: tip2.x, y: tip2.y, vx: bd.vx, vy: bd.vy, life: 0, max: big ? 0.12 : 0.08, k: "flash", sz: big ? 3.8 : 2.4 });
        for (var si = 0; si < (big ? 6 : 2); si++) FL.parts.push({ x: tip2.x, y: tip2.y, vx: bd.vx + d2.x * 4 + (Math.random() - 0.5) * 5, vy: bd.vy + d2.y * 4 + (Math.random() - 0.5) * 5, life: 0, max: 0.6 + Math.random() * 0.5, k: "smoke", sz: big ? 1.4 : 0.8 });
      } else if (w === "rg") {
        // Railgun-Turret: lädt, solange er ausgerichtet bleibt (wie Halten der Maustaste), dann Strahl
        if (b.cd > 0) return;
        if (!aligned && !(b.chg > 0 && best)) return;
        b.holding = true;
        if (bd.energy < RG.e * TUR.eK && !b.chg) return;
        b.chg = (b.chg || 0) + dt;
        if (b.chg >= RG.charge) { b.chg = 0; b.cd = RG.cd; bd.energy = Math.max(0, bd.energy - RG.e * TUR.eK); b.tn = (b.tn || 0) + 1; fireRailFrom(bd, turTip(bd, b), turDir(bd, b)); }
      }
    });
  }
