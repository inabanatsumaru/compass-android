// H3ロケット10号機（MMX）飛行予測モデル
// 出典：JAXA「ロケット打上げ計画書」(2026-08-20) の時刻・高度表、打上げ方位角90°
// ダウンレンジ（地表距離）は計画書に記載がないため、速度表から積分した推定値
(function (root) {
  const LAUNCH_ISO = "2026-10-20T04:41:03+09:00";
  const SITE = { lat: 30.4006, lon: 130.9756 }; // 種子島宇宙センター 大型ロケット第2射点（概略）
  const AZIMUTH = 90; // 打上げ方位角（度）
  const R_EARTH = 6371.0;

  // [経過秒, 高度km, 推定ダウンレンジkm]
  const PROFILE = [
    [0, 0, 0], [20, 1.5, 0.1], [40, 6, 1], [60, 13, 4], [80, 24, 10],
    [100, 40, 25], [116, 59, 45], [118, 61, 47], [150, 92, 95], [197, 131, 180],
    [240, 170, 330], [292, 208, 600], [299, 214, 640], [312, 224, 700],
    [400, 268, 1250], [500, 305, 1900], [640, 329, 2900]
  ];

  const EVENTS = [
    { t: 0, name: "リフトオフ" },
    { t: 116, name: "SRB第1ペア分離" },
    { t: 118, name: "SRB第2ペア分離" },
    { t: 197, name: "フェアリング分離" },
    { t: 292, name: "第1段燃焼停止" },
    { t: 299, name: "1段・2段分離" },
    { t: 312, name: "第2段点火" },
    { t: 640, name: "第2段燃焼停止" }
  ];

  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

  function stateAt(t) {
    if (t <= 0) return { alt: 0, dr: 0 };
    const P = PROFILE;
    if (t >= P[P.length - 1][0]) { const l = P[P.length - 1]; return { alt: l[1], dr: l[2] }; }
    for (let i = 1; i < P.length; i++) {
      if (t <= P[i][0]) {
        const a = P[i - 1], b = P[i], k = (t - a[0]) / (b[0] - a[0]);
        return { alt: a[1] + (b[1] - a[1]) * k, dr: a[2] + (b[2] - a[2]) * k };
      }
    }
  }

  // 射点から方位角AZIMUTHの大円上を dr km 進んだ地点
  function groundPoint(dr) {
    const d = dr / R_EARTH, la1 = rad(SITE.lat), lo1 = rad(SITE.lon), th = rad(AZIMUTH);
    const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(th));
    const lo2 = lo1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
    return { lat: deg(la2), lon: deg(lo2) };
  }

  function ecef(lat, lon, h) {
    const r = R_EARTH + h, la = rad(lat), lo = rad(lon);
    return [r * Math.cos(la) * Math.cos(lo), r * Math.cos(la) * Math.sin(lo), r * Math.sin(la)];
  }

  // 観測者から見た真方位角・仰角・距離
  function lookAngles(obs, t) {
    const s = stateAt(t), g = groundPoint(s.dr);
    const p = ecef(g.lat, g.lon, s.alt), o = ecef(obs.lat, obs.lon, (obs.h || 0) / 1000);
    const dx = p[0] - o[0], dy = p[1] - o[1], dz = p[2] - o[2];
    const la = rad(obs.lat), lo = rad(obs.lon);
    const e = -Math.sin(lo) * dx + Math.cos(lo) * dy;
    const n = -Math.sin(la) * Math.cos(lo) * dx - Math.sin(la) * Math.sin(lo) * dy + Math.cos(la) * dz;
    const u = Math.cos(la) * Math.cos(lo) * dx + Math.cos(la) * Math.sin(lo) * dy + Math.sin(la) * dz;
    const range = Math.hypot(e, n, u);
    let az = deg(Math.atan2(e, n)); if (az < 0) az += 360;
    let el = deg(Math.asin(u / range));
    // 大気差（低高度ほど浮き上がって見える。Bennettの近似）
    if (el > -1) el += 1.02 / Math.tan(rad(el + 10.3 / (el + 5.11))) / 60;
    return { az, el, range, alt: s.alt, dr: s.dr };
  }

  // 見え始め・見え終わり（仰角0°を超えている区間）
  function visibility(obs) {
    let first = null, last = null, peak = null;
    for (let t = 0; t <= 640; t += 1) {
      const a = lookAngles(obs, t);
      if (a.el > 0) {
        if (first === null) first = { t, ...a };
        last = { t, ...a };
        if (!peak || a.el > peak.el) peak = { t, ...a };
      }
    }
    return { first, last, peak };
  }

  root.H3 = { LAUNCH_ISO, SITE, AZIMUTH, PROFILE, EVENTS, END_T: 640, stateAt, lookAngles, visibility };
})(typeof window !== "undefined" ? window : globalThis);
