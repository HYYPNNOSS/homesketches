import re
import os
import shutil

def convert_solid_to_react(content):
    # Add "use client"
    result = '"use client";\n' + content
    
    # Imports
    result = re.sub(r"import \{[^}]*\} from 'solid-js';", "import React, { useState, useEffect, useMemo, useId, type JSX } from 'react';", result)
    result = result.replace("import { For, Show, createMemo, createSignal, createUniqueId, onMount, type JSX } from 'solid-js';", "import React, { useState, useEffect, useMemo, useId, type JSX } from 'react';")
    
    # createSignal -> useState
    # e.g., const [enhanced, setEnhanced] = createSignal(false); -> const [enhanced, setEnhanced] = useState(false);
    result = re.sub(r"createSignal(?:<[^>]+>)?\((.*?)\)", r"useState(\1)", result)
    
    # () -> value (Solid signals are functions, React state is just the value)
    # This is hard to do perfectly with regex, we'll replace common ones.
    # We will just change them manually for the small ones or using specific regex.
    # For now, let's just do class -> className
    result = result.replace('class="', 'className="')
    result = result.replace("class={`", "className={`")
    result = result.replace("class={", "className={")
    
    # For component
    # <For each={care}>{(item, index) => <div/>}</For> -> {care.map((item, index) => <div/>)}
    result = re.sub(r'<For each=\{([^}]+)\}>\{(.*?)\}</For>', r'{\1.map(\2)}', result, flags=re.DOTALL)
    
    # Show component
    # <Show when={condition}>{content}</Show> -> {condition && (content)}
    result = re.sub(r'<Show when=\{([^}]+)\}\>(.*?)</Show>', r'{\1 && (\2)}', result, flags=re.DOTALL)
    
    # onMount -> useEffect
    result = re.sub(r'onMount\(\(\) => (.*?)\);', r'useEffect(() => { \1 }, []);', result)
    
    # createUniqueId -> useId
    result = result.replace('createUniqueId()', 'useId()')
    
    # createMemo -> useMemo
    result = re.sub(r'createMemo\(\(\) => (.*?)\)', r'useMemo(() => (\1), [])', result)
    
    return result

# We will apply this and do manual fixes.
