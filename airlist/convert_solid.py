import os
import re
import glob

def solid_to_react(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add use client
    if "use client" not in content and (".tsx" in filepath or "use client" in content):
        content = '"use client";\n' + content
        
    # Replace imports
    content = re.sub(r"import\s*\{[^}]*\}\s*from\s*['\"]solid-js['\"];?", "import React, { useState, useEffect, useMemo, useId, useRef, Fragment } from 'react';", content)
    content = re.sub(r"import\s*\{[^}]*\}\s*from\s*['\"]solid-js/web['\"];?", "", content)
    
    # className
    content = content.replace('class="', 'className="')
    content = content.replace('class={', 'className={')
    
    # createSignal -> useState
    # Note: const [count, setCount] = createSignal(0) -> useState(0)
    # the usage count() needs to be converted to count
    # we can try a regex: ([a-zA-Z0-9_]+)\(\) -> \1
    # But that's dangerous. Let's do it on a best effort basis.
    content = re.sub(r"createSignal(?:<[^>]+>)?\((.*?)\)", r"useState(\1)", content)
    content = re.sub(r"createMemo(?:<[^>]+>)?\((.*?)\)", r"useMemo(\1, [])", content)
    content = content.replace("createUniqueId()", "useId()")
    content = re.sub(r"onMount\(\s*\(\)\s*=>\s*\{", "useEffect(() => {", content)
    content = re.sub(r"onMount\(\s*\(\)\s*=>\s*(.*?)\s*\)", r"useEffect(() => {\1}, [])", content)
    
    # We will replace signal calls like `count()` with `count`. 
    # This requires looking for variables defined via useState.
    signals = re.findall(r"const\s+\[\s*([a-zA-Z0-9_]+)\s*,\s*[a-zA-Z0-9_]+\s*\]\s*=\s*useState", content)
    for sig in signals:
        content = re.sub(r"\b" + sig + r"\(\)", sig, content)

    # <For each={items}>{(item, index) => ...}</For>
    # -> {items.map((item, index) => ...)}
    def repl_for(m):
        each = m.group(1)
        inner = m.group(2)
        # inner is usually `{(item, index) => <div/>}`
        # strip the outer {}
        inner = inner.strip()
        if inner.startswith('{') and inner.endswith('}'):
            inner = inner[1:-1]
        return f"{{{each}?.map({inner})}}"
    content = re.sub(r"<For\s+each=\{([^}]+)\}\s*>(.*?)</For>", repl_for, content, flags=re.DOTALL)

    # <Show when={cond} fallback={...}>{...}</Show>
    def repl_show(m):
        attrs = m.group(1)
        inner = m.group(2)
        when_m = re.search(r"when=\{([^}]+)\}", attrs)
        fallback_m = re.search(r"fallback=\{([^}]+)\}", attrs)
        when = when_m.group(1) if when_m else "true"
        fallback = fallback_m.group(1) if fallback_m else "null"
        return f"{{{when} ? ({inner}) : ({fallback})}}"
    content = re.sub(r"<Show\s+([^>]+)>(.*?)</Show>", repl_show, content, flags=re.DOTALL)
    
    # Event handlers: onInput -> onChange (partially), onClick -> onClick
    # Solid uses onClick, onInput etc. React uses onClick, onChange.
    content = content.replace("onInput={", "onChange={")
    content = content.replace("onDblClick={", "onDoubleClick={")
    
    # innerHTML (Solid uses innerHTML={val}, React uses dangerouslySetInnerHTML={{__html: val}})
    content = re.sub(r"innerHTML=\{([^}]+)\}", r"dangerouslySetInnerHTML={{__html: \1}}", content)

    # Remove `type JSX` and replace with `React.ReactNode` in interfaces
    content = content.replace("JSX.Element", "React.ReactNode")
    
    # Save back
    with open(filepath, 'w') as f:
        f.write(content)

dirs = ["nglobi/app/about", "nglobi/app/contact", "nglobi/app/services/student-moving", "nglobi/app/partner"]
for d in dirs:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                solid_to_react(os.path.join(root, file))

