// ==UserScript==
// @name         Pico8 Keyboard Hook Helper
// @namespace    https://icelava.top/
// @version      0.2
// @description  Enable the player to customize key bindings.
// @author       ForkKILLET <fork_killet@qq.com>
// @match        https://v6p9d9t4.ssl.hwcdn.net/html/5587462/index.html
// @match        https://v6p9d9t4.ssl.hwcdn.net/html/3226817/index.html
// @match        https://v6p9d9t4.ssl.hwcdn.net/html/235259/Celeste/index.html?v=1542780913
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

const log = (s, ...p) => console.log(`%c[pkhh]%c ${s}`, "display: inline-block; background-color: blue; color: white; border-radius: 3px; padding: 1px 3px;", "", ...p)

const sto = new Proxy({}, {
    get: (_, k) => GM_getValue(k),
    set: (_, k, v) => GM_setValue(k, v)
})

const css = `
#pkhh-ui {
    background: white;
    color: black;
    font-size: 12px;
    padding: 3px;
    border-radius: 7px;
    position: fixed;
    top: 10px;
    left: 10px;
}
#pkhh-ui input {
    width: 15px;
}
#pkhh-kmap {
    list-style: none;
    padding: 0;
}
#pkhh-kmap p {
    display: inline;
}
`

let hotkeyGlobalState = 0
const hotkeyManager = ($display, $button, onchange) => {
    let state = 0
    /* 0: idle
     * 1: inputing
     */
    $button.addEventListener("click", () => {
        if (state) return
        $button.innerHTML = "..."
        hotkeyGlobalState = state = 1
    })

    document.addEventListener("keydown", ({ key, keyCode }) => {
        if (state === 1) {
            onchange(key, keyCode)
            $display.innerHTML = key
            $button.innerHTML = "*"
            hotkeyGlobalState = state = 0
        }
    })
}

const drawUserInterface = () => {
    const $ui = document.createElement("div")
    $ui.id = "pkhh-ui"
    $ui.innerHTML = `
        <style>${css}</style>
        <b>Pico8 Keyboard Hook Helper</b> <i>v${GM_info.script.version}</i><br />
        <a href="https://github.com/ForkKILLET/Pico8-Keyboard-Hook-Helper">GitHub</a> <button id="pkhh-expose">debug</button>
        <hr />
        Hook mode <select id="pkhh-hook-mode">
            <option>wrap</option>
            <option>re-trigger</option>
        </select>
        <hr />
        Key bindings <button id="pkhh-new">+</button>
        <ul id="pkhh-kmap"></ul>
    `
    document.body.appendChild($ui)

    const drawItem = (from, [ to, to_code ]) => {
        const $item = document.createElement("li")
        $item.innerHTML = `
            <kbd></kbd> <button>*</button> =&gt; <kbd></kbd> <button>*</button> <button>X</button>
        `
        $kmap.appendChild($item)
        const [ $from, $from_button, $to, $to_button, $del ] = $item.children

        hotkeyManager($from, $from_button, key => {
            const kmap = sto.kmap
            delete kmap[from]
            from = key
            kmap[from] = to
            sto.kmap = kmap
        })
        hotkeyManager($to, $to_button, (key, keyCode) => {
            const kmap = sto.kmap
            kmap[from] = to = [ key, keyCode ]
            sto.kmap = kmap
        })

        $from.innerHTML = from
        $to.innerHTML = to

        $del.addEventListener("click", () => {
            $item.remove()
            const kmap = sto.kmap
            delete kmap[from]
            sto.kmap = kmap
        })
    }

    const $hook_mode = document.getElementById("pkhh-hook-mode")
    $hook_mode.value = sto.hook_mode ??= "wrap"
    $hook_mode.addEventListener("change", () => {
        sto.hook_mode = $hook_mode.value
    })

    const $expose = document.getElementById("pkhh-expose")
    $expose.addEventListener("click", () => {
        log("Expose to `window.pkhh`")
        unsafeWindow.pkhh = { sto, GM_info }
    })

    const $kmap = document.getElementById("pkhh-kmap")
    for (const [ from, [ to, to_code ] ] of Object.entries(sto.kmap ??= {})) drawItem(from, [ to, to_code ])

    const $new = document.getElementById("pkhh-new")
    $new.addEventListener("click", () => drawItem("", ""))
}

const hookKeyboardEvent = n => {
	document.addEventListener(n, e => {
        if (hotkeyGlobalState === 1) return
		if (e.new || e.TAS) return
		e.stopPropagation()
		const kmap = sto.kmap
		const ne = new KeyboardEvent(n, {
			key: kmap[e.key]?.[0] ?? e.key,
			keyCode: kmap[e.key]?.[1] ?? e.keyCode
		})
		ne.new = true
		document.dispatchEvent(ne)
	})
}

const hookKeyboardEventListener = wrapper => {
    const _addEventListener = Element.prototype.addEventListener
    window.addEventListener = document.addEventListener = function (name, listener) {
        _addEventListener.call(this, name, name === "keydown" || name === "keyup"
            ? wrapper(name, listener)
            : listener
        )
    }
}

drawUserInterface()
log("Draw UI")

switch (sto.hook_mode ??= "wrap") {
    case "re-trigger":
        hookKeyboardEvent("keydown")
        hookKeyboardEvent("keyup")
        break
    case "wrap":
        hookKeyboardEventListener((n, f) => e => {
            const kmap = sto.kmap
            const ne = new KeyboardEvent(n, {
                key: kmap[e.key]?.[0] ?? e.key,
                keyCode: kmap[e.key]?.[1] ?? e.keyCode
            })
            f(ne)
        })
        break
}

log("Hook")
