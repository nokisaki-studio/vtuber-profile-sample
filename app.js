// 綿雲ねむ — おしながき
// 1. 横の舞台のねむが、項目を通るたびに姿を替える(広い画面)。狭い画面では、項目ごとの絵が見えたときに一度だけ弾む。
// 2. お仕事の申込欄の確認(見本のため送信はしない)。
(() => {
  "use strict";

  const TAGS = {
    wave: "ごあいさつ",
    game: "ゲーム中",
    sing: "歌ってます",
    sleep: "ねむい…",
    calendar: "予定はこちら",
    paint: "ルールはこちら",
    work: "お仕事モード",
    receipt: "受け付けました",
  };
  // 札だけ替えて、絵はほかの姿を使うもの
  const ART = { receipt: "work" };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wide = window.matchMedia("(min-width: 1000px)");

  // ---------- 絵を <use> から実体に置き換える ----------
  // <use> の中身にはページ側の変数(--mx / --my)が届かないため、版ズレを動かせない。
  // 読み込み時に symbol の中身を複製して置く(JS がないときは <use> のまま表示される)。
  const paint = (svg, pose) => {
    const symbol = document.getElementById(`nemu-${pose}`);
    if (!symbol) return;
    const parts = [...symbol.childNodes].filter((n) => n.nodeName !== "title").map((n) => n.cloneNode(true));
    svg.replaceChildren(...parts);
  };
  document.querySelectorAll(".pose svg, .stage-art").forEach((svg) => {
    const use = svg.querySelector("use");
    if (use) paint(svg, use.getAttribute("href").replace("#nemu-", ""));
  });

  // ---------- 舞台の姿 ----------
  const stageArt = document.querySelector(".stage-art");
  const stageTag = document.getElementById("stage-tag");
  const stageInner = document.querySelector(".stage-inner");
  let current = "wave";

  const replay = (el, cls) => {
    if (reduceMotion.matches) return;
    el.classList.remove(cls);
    void el.offsetWidth; // 同じ動きをもう一度
    el.classList.add(cls);
  };

  const stageNum = document.getElementById("stage-num");
  let activeItem = null;

  const setPose = (pose, item = null) => {
    // どの項目の姿かを、番号の丸と札の数字で示す
    if (item !== activeItem) {
      if (activeItem) activeItem.classList.remove("is-active");
      if (item) item.classList.add("is-active");
      activeItem = item;
      const num = item ? item.querySelector(".num").textContent : "";
      stageNum.textContent = num;
      stageNum.hidden = !num;
    }
    if (!TAGS[pose] || pose === current) return;
    current = pose;
    paint(stageArt, ART[pose] || pose);
    stageTag.textContent = TAGS[pose];
    replay(stageInner, "is-swapping");
  };

  // 替わる水準: 見出しの点線(リーダー)が、ねむの首の高さまで上がってきたら、その項目の姿になる。
  // 首の高さは、舞台の絵の実際の位置から毎回測る(画面の大きさが違っても同じ決まりになる)。
  // 首 = 絵の viewBox(高さ 360)で、頭の毛の下端と体の上端の間の y=210。
  const NECK = 210 / 360;
  const items = [...document.querySelectorAll(".item")];
  const leaders = items.map((item) => item.querySelector(".item-head .leader"));
  const hero = document.querySelector(".hero");
  const colophon = document.querySelector(".colophon");

  // 姿が替わる瞬間の弾み(transform)で絵の位置が動くと、首の高さが揺れて行き来してしまう。
  // 弾んでいる間は、直前に測った首の高さを使う。
  let neckY = null;
  stageInner.addEventListener("animationend", (e) => {
    if (e.target === stageInner) stageInner.classList.remove("is-swapping");
  });
  const measureNeck = () => {
    if (neckY !== null && stageInner.classList.contains("is-swapping")) return neckY;
    const r = stageArt.getBoundingClientRect();
    if (r.height > 0) neckY = r.top + r.height * NECK;
    return neckY;
  };

  const pick = () => {
    if (!wide.matches) return;
    const line = measureNeck();
    if (line === null) return;
    let active = null;
    items.forEach((item, i) => {
      const r = leaders[i].getBoundingClientRect();
      if (r.top + r.height / 2 <= line) active = item;
    });
    // 最後まで読み切ったら、手を振って見送る(受付票を出している間は受付の姿のまま)
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const lastHead = items[items.length - 1].querySelector(".item-head").getBoundingClientRect().top;
    if (atEnd && lastHead < 0) setPose(colophon.dataset.pose, null);
    else if (active) setPose(active.dataset.pose, active);
    else setPose(hero.dataset.pose, null);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      pick();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  wide.addEventListener("change", onScroll);
  pick();

  // ---------- 狭い画面: 項目ごとの絵 ----------
  const inlineObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || wide.matches) return;
        if (!reduceMotion.matches) e.target.classList.add("is-in");
        inlineObserver.unobserve(e.target);
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll(".pose-inline").forEach((f) => inlineObserver.observe(f));

  // ---------- 申込欄 ----------
  const request = document.getElementById("request");
  const form = document.getElementById("request-form");
  const receipt = document.getElementById("receipt");
  const receiptList = document.getElementById("receipt-list");
  const back = document.getElementById("receipt-back");
  const mailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const fields = {
    name: { input: form.elements.name, error: document.getElementById("e-name"), ok: (v) => v.trim() !== "" },
    mail: { input: form.elements.mail, error: document.getElementById("e-mail"), ok: (v) => mailPattern.test(v.trim()) },
    body: { input: form.elements.body, error: document.getElementById("e-body"), ok: (v) => v.trim() !== "" },
  };
  const kindError = document.getElementById("e-kind");
  const kindBoxes = [...form.querySelectorAll('input[name="kind"]')];
  const kindFieldset = kindBoxes[0].closest("fieldset");

  const show = (field, bad) => {
    field.error.hidden = !bad;
    if (bad) field.input.setAttribute("aria-invalid", "true");
    else field.input.removeAttribute("aria-invalid");
  };
  const showKind = (bad) => {
    kindError.hidden = !bad;
    if (bad) kindFieldset.setAttribute("aria-describedby", "e-kind");
    else kindFieldset.removeAttribute("aria-describedby");
  };

  Object.values(fields).forEach((field) => {
    field.input.addEventListener("input", () => {
      if (!field.error.hidden && field.ok(field.input.value)) show(field, false);
    });
  });
  kindBoxes.forEach((b) => b.addEventListener("change", () => {
    if (!kindError.hidden && kindBoxes.some((k) => k.checked)) showKind(false);
  }));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let firstBad = null;
    Object.values(fields).forEach((field) => {
      const bad = !field.ok(field.input.value);
      show(field, bad);
      if (bad && !firstBad) firstBad = field.input;
    });
    const noKind = !kindBoxes.some((k) => k.checked);
    showKind(noKind);
    if (noKind && !firstBad) firstBad = kindBoxes[0];
    if (firstBad) {
      firstBad.focus();
      return;
    }

    const rows = [
      ["お名前・会社名", fields.name.input.value.trim()],
      ["メールアドレス", fields.mail.input.value.trim()],
      ["ご依頼の種類", kindBoxes.filter((k) => k.checked).map((k) => k.value).join("、")],
      ["内容", fields.body.input.value.trim()],
    ];
    receiptList.replaceChildren(
      ...rows.map(([label, value]) => {
        const row = document.createElement("div");
        const dt = document.createElement("dt");
        const leader = document.createElement("span");
        const dd = document.createElement("dd");
        dt.textContent = label;
        leader.className = "leader";
        leader.setAttribute("aria-hidden", "true");
        dd.textContent = value;
        row.append(dt, leader, dd);
        return row;
      })
    );
    form.hidden = true;
    receipt.hidden = false;
    request.dataset.pose = "receipt";
    colophon.dataset.pose = "receipt";
    if (wide.matches) setPose("receipt", request);
    receipt.focus();
    replay(receipt.querySelector(".receipt-mark"), "is-pressed"); // 受付印が「ポン!」と押される
  });

  back.addEventListener("click", () => {
    receipt.hidden = true;
    form.hidden = false;
    request.dataset.pose = "work";
    colophon.dataset.pose = "wave";
    if (wide.matches) setPose("work", request);
    fields.name.input.focus();
  });
})();
