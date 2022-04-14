// ==UserScript==
// @name         Pico8 Keyboard Hook Helper
// @namespace    https://icelava.top/
// @version      0.1
// @description  Enable user to customize key bindings.
// @author       ForkKILLET <fork_killet@qq.com>
// @match        https://v6p9d9t4.ssl.hwcdn.net/html/5587462/index.html
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

const log = (s, ...p) => console.log(`[pkhh] ${s}`, ...p)

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
        <b>Pico8 Keyboard Hook Helper</p>
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

    const $kmap = document.getElementById("pkhh-kmap")
    for (const [ from, [ to, to_code ] ] of Object.entries(sto.kmap ??= {})) drawItem(from, [ to, to_code ])

    const $new = document.getElementById("pkhh-new")
    $new.addEventListener("click", () => drawItem("", ""))

    log("drawUserInterface OK")
}

const hookKeyboardEvent = (name, doLog) => {
	document.addEventListener(name, e => {
        if (hotkeyGlobalState === 1) return
		if (e.new) return
		e.stopPropagation()
		const kmap = sto.kmap
		const ne = new KeyboardEvent(name, {
			key: kmap[e.key] ?? e.key,
			keyCode: kmap[e.key]?.[1] ?? e.key
		})
		ne.new = true
		if (doLog) {
			console.log("e: %o", e)
			console.log("ne: %o", ne)
		}
		document.dispatchEvent(ne)
	})
}


hookKeyboardEvent("keydown")
hookKeyboardEvent("keyup")
drawUserInterface()
