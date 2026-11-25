"""Repeat mobile UI measurements against a production build (Python Playwright)."""

import argparse
import json
import statistics
from pathlib import Path

from playwright.sync_api import sync_playwright

WAIT_FOR_PAINT = """(selector) => new Promise((resolve, reject) => {
  const check = () => {
    if (!document.querySelector(selector)) return
    observer.disconnect()
    clearTimeout(timeout)
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - (window.clicked || 0))))
  }
  const observer = new MutationObserver(check)
  const timeout = setTimeout(() => {
    observer.disconnect()
    reject(new Error('Missing measured state: ' + selector))
  }, 15000)
  observer.observe(document.body, {childList:true,subtree:true,attributes:true})
  check()
})"""
COUNT_ROW_REFS = """(() => {
  window.clicked = 0; window.rowRefs = 0; window.slowTasks = []
  addEventListener('click', () => window.clicked = performance.now(), true)
  const set = Map.prototype.set
  Map.prototype.set = function(key,value) {
    if (typeof key==='string' && value instanceof HTMLElement && value.dataset.occurrenceId===key) window.rowRefs++
    return set.call(this,key,value)
  }
  new PerformanceObserver(list => window.slowTasks.push(...list.getEntries().map(e => e.duration))).observe({type:'longtask'})
  const observer = new MutationObserver(() => {
    if (document.querySelector('.library-search input') && !window.libraryReady) {
      window.libraryReady = performance.now()
      observer.disconnect()
    }
  })
  observer.observe(document,{subtree:true,childList:true})
})()"""


def measure_journey(pw, options):
    browser = pw.chromium.launch(executable_path=options.edge)
    rows = []
    for index in range(options.trials):
        row = journey_trial(browser, options, capture=index == 0)
        rows.append(row)
        print(index + 1, row, flush=True)
    report = {"sha": options.sha, "browser": browser.version, "rows": rows}
    (options.output / "results.json").write_text(
        json.dumps(report, indent=2), encoding="utf8"
    )
    browser.close()


def journey_trial(browser, options, capture):
    base = options.url
    ctx = browser.new_context(
        viewport={"width": 393, "height": 852},
        has_touch=True,
        reduced_motion="reduce",
        service_workers="block",
    )
    page = ctx.new_page()
    page.set_default_timeout(15000)
    sha = page.request.get(base + "version.json").json()["commit"]
    assert sha == options.sha[:12], (sha, options.sha)
    cdp = ctx.new_cdp_session(page)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    cdp.send("Network.enable")
    cdp.send(
        "Network.emulateNetworkConditions",
        {
            "offline": False,
            "latency": 25,
            "downloadThroughput": 1500000,
            "uploadThroughput": 750000,
        },
    )
    page.add_init_script(COUNT_ROW_REFS)
    page.goto(base, wait_until="domcontentloaded")
    page.locator(".library-search input").wait_for()
    row = {"catalogMs": page.evaluate("window.libraryReady")}

    def shot(name):
        if capture:
            page.screenshot(
                path=options.output / (name + ".png"), animations="disabled"
            )

    shot("catalog")
    song = page.get_by_role("link", name="打开 NIGHT DANCER", exact=True)
    page.locator("input[type=search]").fill("night")
    song.click()
    row["songMs"] = page.evaluate(WAIT_FOR_PAINT, ".practice-original")
    shot("practice")
    page.get_by_role("button", name="选择学习段：", exact=False).click()
    page.get_by_role("option").nth(1).click()
    page.locator("main").get_by_role("link", name="返回曲库", exact=True).click()
    song.click()
    row["warmMs"] = page.evaluate(WAIT_FOR_PAINT, ".practice-original")
    page.get_by_role("button", name="全曲", exact=True).click()
    page.locator(".full-song-original").first.wait_for()
    page.evaluate("window.rowRefs=0")
    for j in range(4):
        # Select an existing verse, wait for the real active row, then pause.
        loc = page.locator(".full-song-occurrence").nth(j)
        loc.locator(".full-song-original").click()
        page.wait_for_function(
            "document.querySelector('.full-song-player button[aria-label=\"暂停\"]') || [...document.querySelectorAll('.full-song-player button')].some(b=>b.textContent.trim()==='暂停')"
        )
        page.get_by_role("button", name="暂停", exact=True).click()
    row["rowRegistrations"] = page.evaluate("window.rowRefs")
    page.locator(".full-song-occurrence").nth(3).scroll_into_view_if_needed()
    shot("full")

    row["scrollWorstFrameMs"] = page.evaluate("""async () => {
          const t=[]; const start=scrollY
          for(let i=0;i<32;i++) { t.push(await new Promise(requestAnimationFrame)); scrollTo(0,start+3*i) }
          return Math.max(...t.slice(1).map((v,i)=>v-t[i]))
        }""")

    slider = page.get_by_role("slider", name="播放进度")
    box = slider.bounding_box()
    page.mouse.move(box["x"] + 5, box["y"] + box["height"] / 2)
    page.mouse.down()
    page.mouse.move(
        box["x"] + box["width"] * 0.4, box["y"] + box["height"] / 2, steps=6
    )
    page.mouse.up()
    page.get_by_role("button", name="讲解", exact=True).click()
    page.locator(".explain-article .feature-markdown").wait_for()
    shot("explain")
    page.locator(".site-settings-link").click()
    row["settingsMs"] = page.evaluate(WAIT_FOR_PAINT, ".settings-changelog")
    row["historyNodes"] = page.locator(".settings-changelog *").count()
    shot("settings")
    page.get_by_role("link", name="打开播放切口调试 →").click()
    page.get_by_role("link", name="妄想感傷代償連盟", exact=False).click()
    page.set_viewport_size({"width": 393, "height": 570})
    page.locator("#timing-occurrence-o036 button").click()
    page.locator(".timing-debugger-console").get_by_role(
        "button", name="+20ms", exact=True
    ).first.click()
    page.evaluate("document.querySelector('.timing-debugger-console-body').scrollTop=0")
    page.evaluate(
        "document.querySelector('#timing-occurrence-o036').scrollIntoView({block:'start'})"
    )
    row["dockPx"] = page.locator(".timing-debugger-console").bounding_box()["height"]
    row["savePx"] = page.get_by_role("button", name="保存本机微调").bounding_box()[
        "height"
    ]
    shot("timing")
    row.update(
        page.evaluate(
            """()=>{const res=performance.getEntriesByType('resource');return {requests:res.length,transferBytes:res.reduce((a,b)=>a+b.transferSize,0),longTasks:window.slowTasks.length}}"""
        )
    )
    ctx.close()
    return row


def measure_playback(pw, options):
    browser = pw.chromium.launch(executable_path=options.edge)
    base = options.url
    out = options.output
    ctx = browser.new_context(
        viewport={"width": 393, "height": 852},
        has_touch=True,
        reduced_motion="reduce",
        service_workers="block",
    )
    p = ctx.new_page()
    identity = p.request.get(base + "version.json").json()
    assert identity["commit"] == options.sha[:12]
    cdp = ctx.new_cdp_session(p)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    cdp.send("Performance.enable")
    p.goto(base + "#edition=mousou-kanshou-daishou-renmei")
    p.get_by_role("button", name="全曲", exact=True).click()
    p.locator(".full-song-original").first.wait_for()
    samples = []

    def scripting():
        return next(
            m["value"]
            for m in cdp.send("Performance.getMetrics")["metrics"]
            if m["name"] == "ScriptDuration"
        )

    for trial in range(options.trials + 1):
        start = scripting()
        feedback = []
        for occ in ["o033", "o036", "o037", "o040"]:
            # The clock starts at native button activation and ends after the selected row and pause control are painted.
            feedback.append(
                p.evaluate(
                    """async id=>{
              const row = document.querySelector('[data-occurrence-id="'+id+'"]')
              const start = performance.now()
              row.querySelector('.full-song-original').click()
              for(let n=0;n<1200;n++){
                await new Promise(requestAnimationFrame)
                const pause = [...document.querySelectorAll('.full-song-player button')].find(b=>b.textContent.trim()==='暂停' || b.getAttribute('aria-label')==='暂停')
                if(row.classList.contains('is-selected') && pause){
                  await new Promise(requestAnimationFrame)
                  const elapsed=performance.now()-start
                  pause.click()
                  await new Promise(requestAnimationFrame)
                  await new Promise(requestAnimationFrame)
                  return elapsed
                }
              }
              throw Error('Playback state did not settle: '+id)
            }""",
                    occ,
                )
            )
        if trial:
            samples.append(
                {
                    "scriptMs": (scripting() - start) * 1000,
                    "feedbackMs": statistics.median(feedback),
                    "feedback": feedback,
                }
            )
    (out / "playback.json").write_text(
        json.dumps(
            {
                "build": identity["commit"],
                "browser": browser.version,
                "trials": samples,
            },
            indent=2,
        )
    )
    print(
        "script median",
        statistics.median(r["scriptMs"] for r in samples),
        "feedback median",
        statistics.median(r["feedbackMs"] for r in samples),
    )
    browser.close()


def measure_surfaces(pw, options):
    browser = pw.chromium.launch(executable_path=options.edge)
    base = options.url
    out = options.output
    ctx = browser.new_context(
        viewport={"width": 393, "height": 570},
        has_touch=True,
        reduced_motion="reduce",
        locale="zh-CN",
    )
    p = ctx.new_page()
    assert p.request.get(base + "version.json").json()["commit"] == options.sha[:12]
    cdp = ctx.new_cdp_session(p)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    p.goto(base)
    p.wait_for_function("navigator.serviceWorker.controller")
    p.locator(".site-settings-link").click()
    p.get_by_role("heading", name="系统与更新").wait_for()
    p.set_viewport_size({"width": 393, "height": 852})
    p.evaluate("window.scrollTo(0,0)")
    p.screenshot(path=out / "settings.png")
    p.locator(".brand-lockup").click()
    p.get_by_role("link", name="打开 NIGHT DANCER", exact=True).click()
    p.set_viewport_size({"width": 393, "height": 570})
    p.locator(".practice-original").first.wait_for()
    samples = {}

    def trace(name, dock):
        p.evaluate("window.scrollTo(0,200)")
        rect = dock.bounding_box()
        surface = dock.evaluate(
            "(el)=>({bg:getComputedStyle(el).backgroundColor,blur:getComputedStyle(el).backdropFilter})"
        )
        trials = []
        for trial in range(6):
            p.evaluate("window.scrollTo(0,200)")
            events = []
            handler = lambda data, batch=events: batch.extend(data["value"])
            cdp.on("Tracing.dataCollected", handler)
            cdp.send(
                "Tracing.start",
                {
                    "categories": "cc,benchmark,devtools.timeline",
                    "transferMode": "ReportEvents",
                },
            )
            intervals = p.evaluate(
                """async()=>{const f=[];for(let i=0;i<48;i++){f.push(await new Promise(requestAnimationFrame));scrollTo(0,200+i*5)}return f.slice(1).map((t,i)=>t-f[i])}"""
            )
            ended = []
            cdp.once(
                "Tracing.tracingComplete", lambda _, result=ended: result.append(True)
            )
            cdp.send("Tracing.end")
            for _ in range(200):
                if ended:
                    break
                p.wait_for_timeout(25)
            assert ended, "Trace did not complete"
            cdp.remove_listener("Tracing.dataCollected", handler)
            if trial:
                raster = (
                    sum(e.get("dur", 0) for e in events if e["name"] == "RasterTask")
                    / 1000
                )
                draw = (
                    sum(
                        e.get("dur", 0)
                        for e in events
                        if e["name"] == "LayerTreeHostImpl::PrepareToDraw"
                    )
                    / 1000
                )
                trials.append([raster, draw, max(intervals)])
        samples[name] = {
            "rect": rect,
            "style": surface,
            "raster_draw_worstFrame_ms": trials,
        }

    trace("practice", p.locator(".practice-controls.practice-dock"))
    p.get_by_role("button", name="全曲", exact=True).click()
    trace("full", p.locator(".full-song-player"))
    p.locator(".full-song-original").first.click()
    p.get_by_role("button", name="暂停", exact=True).click()
    p.locator(".full-song-occurrence").first.get_by_role(
        "button", name="看相关讲解"
    ).click()
    quote = p.locator(".is-related-target .explain-lyric-quote")
    quote.wait_for()
    p.evaluate(
        "const r=document.querySelector('.is-related-target');window.scrollBy(0,r.getBoundingClientRect().top-140)"
    )
    p.evaluate(
        "()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))"
    )
    samples["quoteTools"] = p.locator(".practice-page-tools").bounding_box()
    p.screenshot(path=out / "return.png")
    p.get_by_role("button", name="返回来源位置").click()
    assert p.locator(".full-song-original").first.evaluate(
        "el=>el===document.activeElement"
    )
    p.goto(base + "#timing=debug&edition=mousou-kanshou-daishou-renmei&occurrence=o036")
    p.locator("#timing-occurrence-o036 button[aria-pressed=true]").wait_for()
    trace("timing", p.locator(".timing-debugger-console"))
    (out / "surfaces.json").write_text(json.dumps(samples, indent=2))
    browser.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "output", type=Path, help="Directory for JSON measurements and viewport images"
    )
    parser.add_argument("sha", help="Expected build commit from version.json")
    parser.add_argument("--url", default="http://127.0.0.1:4197/red-repeat/")
    parser.add_argument("--edge", required=True, help="Path to the Edge executable")
    parser.add_argument("--trials", type=int, default=10)
    parser.add_argument(
        "--suite", choices=["all", "journey", "playback", "surfaces"], default="all"
    )
    options = parser.parse_args()
    if options.trials < 1:
        parser.error("--trials must be positive")
    options.url = options.url.rstrip("/") + "/"
    options.output.mkdir(exist_ok=True, parents=True)
    with sync_playwright() as pw:
        for name, measure in [
            ("journey", measure_journey),
            ("playback", measure_playback),
            ("surfaces", measure_surfaces),
        ]:
            if options.suite in ("all", name):
                measure(pw, options)


if __name__ == "__main__":
    main()
