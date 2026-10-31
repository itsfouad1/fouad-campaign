import { iconMarkup } from "./icons.js";
// Small DOM helpers, not a framework. The browser runs these files directly.
export const Fragment = Symbol("fragment");
export function icon(name) {
  return (props) => {
    const template = document.createElement("template");
    template.innerHTML = iconMarkup[name];
    const svg = template.content.firstChild;
    const size = props?.size || 24;
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("aria-hidden", "true");
    if (props?.color) svg.setAttribute("color", props.color);
    if (props?.style)
      for (const [k, v] of Object.entries(props.style))
        svg.style[k] = typeof v === "number" ? v + "px" : v;
    return svg;
  };
}
export function h(tag, props, ...children) {
  if (typeof tag === "function") return tag(props || {});
  const el =
    tag === Fragment
      ? document.createDocumentFragment()
      : document.createElement(tag);
  props = props || {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "key" || value == null) continue;
    if (key === "ref") {
      value.current = el;
      continue;
    }
    if (key === "className") {
      el.className = value;
      continue;
    }
    if (key === "htmlFor") {
      el.htmlFor = value;
      continue;
    }
    if (key === "style") {
      for (const [k, v] of Object.entries(value)) {
        el.style[k] =
          typeof v === "number" &&
          ![
            "opacity",
            "zIndex",
            "flex",
            "order",
            "fontWeight",
            "lineHeight",
          ].includes(k)
            ? v + "px"
            : v;
      }
      continue;
    }
    if (key.startsWith("on")) {
      const event =
        key === "onChange" &&
        tag === "input" &&
        props.type !== "file" &&
        props.type !== "checkbox"
          ? "input"
          : key === "onChange" && tag === "textarea"
            ? "input"
            : key.slice(2).toLowerCase();
      el.addEventListener(event, value);
      continue;
    }
    if (
      ["value", "checked", "disabled", "tabIndex", "selected", "open"].includes(
        key,
      )
    ) {
      el[key] = value;
      continue;
    }
    if (typeof value === "boolean" && !key.startsWith("aria-")) {
      if (value) el.setAttribute(key, "");
      continue;
    }
    el.setAttribute(key, String(value));
  }
  function append(child) {
    if (Array.isArray(child)) {
      child.forEach(append);
      return;
    }
    if (child === false || child === true || child == null) return;
    el.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
  children.forEach(append);
  return el;
}
export function mount(root, initial, build, afterRender = () => {}) {
  let scheduled = false;
  const view = {
    state: initial,
    refs: {},
    initialized: false,
    lastActiveElement: null,
    set(key, value) {
      view.state[key] =
        typeof value === "function" ? value(view.state[key]) : value;
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(() => view.render());
      }
    },
    render() {
      scheduled = false;
      const active = document.activeElement,
        oldDialog = root.querySelector("dialog");
      let path = [];
      if (active && root.contains(active)) {
        let current = active;
        while (current !== root) {
          path.unshift(
            Array.prototype.indexOf.call(current.parentNode.children, current),
          );
          current = current.parentNode;
        }
      }
      view.lastActiveElement = active;
      if (view.state.modal && !oldDialog?.open)
        view.beforeDialogPath = [...path];
      if (!view.state.modal && oldDialog?.open && view.beforeDialogPath)
        path = [...view.beforeDialogPath];
      let start = null,
        end = null;
      try {
        start = active.selectionStart;
        end = active.selectionEnd;
      } catch {}
      const scrollY = window.scrollY;
      const dialogScroll = oldDialog?.scrollTop || 0;
      const dom = build();
      root.replaceChildren(dom);
      afterRender();
      if (path.length) {
        let restored = root;
        for (const idx of path) {
          restored = restored?.children[idx];
        }
        if (
          restored?.tagName === active.tagName &&
          restored?.getAttribute("type") === active.getAttribute("type")
        ) {
          restored.focus?.({ preventScroll: true });
          try {
            if (start !== null) restored.setSelectionRange(start, end);
          } catch {}
        }
      }
      const newDialog = root.querySelector("dialog");
      if (newDialog) newDialog.scrollTop = dialogScroll;
      if (Math.abs(window.scrollY - scrollY) > 1) window.scrollTo(0, scrollY);
    },
  };
  return view;
}
