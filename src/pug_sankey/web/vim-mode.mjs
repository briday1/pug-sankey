import { indentSourceSelection } from "./editor-source.mjs";

function lineBounds(value, position) {
  const start = value.lastIndexOf("\n", Math.max(0, position - 1)) + 1;
  const next = value.indexOf("\n", position);
  return { start, end: next < 0 ? value.length : next };
}

function firstNonblank(value, position) {
  const bounds = lineBounds(value, position);
  return bounds.start + (value.slice(bounds.start, bounds.end).match(/^\s*/)?.[0].length ?? 0);
}

function nextWord(value, position) {
  let cursor = position;
  const word = /[\w-]/;
  if (word.test(value[cursor] ?? "")) while (cursor < value.length && word.test(value[cursor])) cursor += 1;
  while (cursor < value.length && !word.test(value[cursor])) cursor += 1;
  return cursor;
}

function previousWord(value, position) {
  let cursor = Math.max(0, position - 1);
  const word = /[\w-]/;
  while (cursor > 0 && !word.test(value[cursor])) cursor -= 1;
  while (cursor > 0 && word.test(value[cursor - 1])) cursor -= 1;
  return cursor;
}

function endWord(value, position) {
  let cursor = position;
  const word = /[\w-]/;
  while (cursor < value.length && !word.test(value[cursor])) cursor += 1;
  while (cursor + 1 < value.length && word.test(value[cursor + 1])) cursor += 1;
  return cursor;
}

export function attachVimMode(textarea, toggle, indicator) {
  const state = {
    enabled: false,
    mode: "normal",
    cursor: 0,
    anchor: 0,
    pending: "",
    register: "",
    linewise: false,
    marks: new Map(),
    undo: [],
    redo: [],
    restoring: false,
    desiredColumn: null,
  };

  const snapshot = () => ({
    value: textarea.value,
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  });

  function updateIndicator() {
    indicator.hidden = !state.enabled;
    indicator.textContent = state.enabled
      ? "-- " + state.mode.toUpperCase() + (state.pending ? " " + state.pending : "") + " --"
      : "";
    textarea.classList.toggle("vim-enabled", state.enabled);
    textarea.dataset.vimMode = state.enabled ? state.mode : "";
    textarea.dispatchEvent(new CustomEvent("vim-mode-change", { detail: { enabled: state.enabled, mode: state.mode } }));
  }

  function setCursor(position, preserveColumn = false) {
    const maximum = Math.max(0, textarea.value.length - (state.mode === "insert" ? 0 : 1));
    state.cursor = Math.max(0, Math.min(maximum, position));
    if (state.mode === "visual") {
      textarea.setSelectionRange(
        Math.min(state.anchor, state.cursor),
        Math.min(textarea.value.length, Math.max(state.anchor, state.cursor) + 1),
        state.cursor < state.anchor ? "backward" : "forward",
      );
    } else if (state.mode === "visual line") {
      const first = lineBounds(textarea.value, Math.min(state.anchor, state.cursor));
      const last = lineBounds(textarea.value, Math.max(state.anchor, state.cursor));
      textarea.setSelectionRange(first.start, Math.min(textarea.value.length, last.end + 1), state.cursor < state.anchor ? "backward" : "forward");
    } else {
      textarea.setSelectionRange(state.cursor, state.cursor);
    }
    if (!preserveColumn) state.desiredColumn = null;
    textarea.scrollTop = Math.max(0, (textarea.value.slice(0, state.cursor).split("\n").length - 3) * 20);
  }

  function enterMode(mode) {
    state.pending = "";
    state.mode = mode;
    if (mode.startsWith("visual")) state.anchor = state.cursor;
    setCursor(state.cursor);
    updateIndicator();
  }

  function checkpoint() {
    state.undo.push(snapshot());
    if (state.undo.length > 300) state.undo.shift();
    state.redo.length = 0;
  }

  function notifyInput() {
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function indentCommand(outdent) {
    checkpoint();
    const visual = state.mode.startsWith("visual");
    const result = indentSourceSelection(textarea.value, visual ? textarea.selectionStart : state.cursor, visual ? textarea.selectionEnd : state.cursor, outdent);
    textarea.value = result.value;
    state.cursor = result.start;
    notifyInput();
    enterMode("normal");
  }

  function replaceRange(start, end, replacement, cursor) {
    checkpoint();
    textarea.setRangeText(replacement, start, end, "start");
    state.cursor = Math.max(0, Math.min(textarea.value.length, cursor));
    setCursor(state.cursor);
    notifyInput();
  }

  function selectedRange() {
    return { start: textarea.selectionStart, end: textarea.selectionEnd };
  }

  function vertical(delta) {
    const value = textarea.value;
    const bounds = lineBounds(value, state.cursor);
    const column = state.desiredColumn ?? state.cursor - bounds.start;
    const adjacent = delta < 0
      ? (bounds.start > 0 ? lineBounds(value, bounds.start - 1) : bounds)
      : (bounds.end < value.length ? lineBounds(value, bounds.end + 1) : bounds);
    state.desiredColumn = column;
    setCursor(Math.min(adjacent.end, adjacent.start + column), true);
  }

  function move(key) {
    const value = textarea.value;
    const bounds = lineBounds(value, state.cursor);
    if (key === "h" || key === "ArrowLeft") setCursor(Math.max(bounds.start, state.cursor - 1));
    else if (key === "l" || key === "ArrowRight") setCursor(Math.min(Math.max(bounds.start, bounds.end - 1), state.cursor + 1));
    else if (key === "j" || key === "ArrowDown") vertical(1);
    else if (key === "k" || key === "ArrowUp") vertical(-1);
    else if (key === "0" || key === "Home") setCursor(bounds.start);
    else if (key === "^") setCursor(firstNonblank(value, state.cursor));
    else if (key === "$" || key === "End") setCursor(Math.max(bounds.start, bounds.end - 1));
    else if (key === "w") setCursor(nextWord(value, state.cursor));
    else if (key === "b") setCursor(previousWord(value, state.cursor));
    else if (key === "e") setCursor(endWord(value, state.cursor));
    else return false;
    return true;
  }

  function restore(from, to) {
    const next = from.pop();
    if (!next) return;
    to.push(snapshot());
    state.restoring = true;
    textarea.value = next.value;
    state.cursor = next.start;
    textarea.setSelectionRange(next.start, next.end);
    state.restoring = false;
    notifyInput();
  }

  function lineRange(position = state.cursor) {
    const bounds = lineBounds(textarea.value, position);
    return { start: bounds.start, end: Math.min(textarea.value.length, bounds.end + 1) };
  }

  function yank(start, end, linewise = false) {
    state.register = textarea.value.slice(start, end);
    state.linewise = linewise;
  }

  function visualCommand(key) {
    const range = selectedRange();
    if (key === "y") {
      yank(range.start, range.end, state.mode === "visual line");
      state.cursor = range.start;
      enterMode("normal");
    } else if (key === "d" || key === "x" || key === "c") {
      yank(range.start, range.end, state.mode === "visual line");
      replaceRange(range.start, range.end, "", range.start);
      enterMode(key === "c" ? "insert" : "normal");
    } else if (key === "p") {
      replaceRange(range.start, range.end, state.register, range.start + Math.max(0, state.register.length - 1));
      enterMode("normal");
    } else if (key === "v" && state.mode === "visual") enterMode("normal");
    else if (key === "V" && state.mode === "visual line") enterMode("normal");
    else return false;
    return true;
  }

  function operatorCommand(operator, motion) {
    if (motion === operator) {
      const range = lineRange();
      yank(range.start, range.end, true);
      if (operator !== "y") replaceRange(range.start, range.end, "", range.start);
      enterMode(operator === "c" ? "insert" : "normal");
      return true;
    }
    const origin = state.cursor;
    if (!move(motion)) return false;
    const destination = state.cursor;
    const inclusive = ["e", "$", "l"].includes(motion) ? 1 : 0;
    const start = Math.min(origin, destination);
    const end = Math.min(textarea.value.length, Math.max(origin, destination) + inclusive);
    yank(start, end);
    if (operator !== "y") replaceRange(start, end, "", start);
    else setCursor(origin);
    enterMode(operator === "c" ? "insert" : "normal");
    return true;
  }

  function pendingCommand(key) {
    const pending = state.pending;
    state.pending = "";
    if (["d", "y", "c"].includes(pending)) return operatorCommand(pending, key);
    if (pending === "m" && /^[a-zA-Z]$/.test(key)) {
      state.marks.set(key, state.cursor);
      updateIndicator();
      return true;
    }
    if ((pending === "'" || pending === String.fromCharCode(96)) && state.marks.has(key)) {
      const mark = state.marks.get(key);
      setCursor(pending === "'" ? firstNonblank(textarea.value, mark) : mark);
      updateIndicator();
      return true;
    }
    if (pending === "r" && key.length === 1 && state.cursor < textarea.value.length) {
      replaceRange(state.cursor, state.cursor + 1, key, state.cursor);
      updateIndicator();
      return true;
    }
    if (pending === "g" && key === "g") {
      setCursor(0);
      updateIndicator();
      return true;
    }
    updateIndicator();
    return true;
  }

  function normalCommand(event) {
    const key = event.key;
    if (state.pending) return pendingCommand(key);
    if (move(key)) return true;
    const bounds = lineBounds(textarea.value, state.cursor);
    if (event.ctrlKey && key.toLowerCase() === "r") restore(state.redo, state.undo);
    else if (["d", "y", "c", "m", "'", String.fromCharCode(96), "r", "g"].includes(key)) {
      state.pending = key;
      updateIndicator();
    } else if (key === "i") enterMode("insert");
    else if (key === "a") { state.cursor = Math.min(bounds.end, state.cursor + 1); enterMode("insert"); }
    else if (key === "I") { state.cursor = firstNonblank(textarea.value, state.cursor); enterMode("insert"); }
    else if (key === "A") { state.cursor = bounds.end; enterMode("insert"); }
    else if (key === "o" || key === "O") {
      const indentation = textarea.value.slice(bounds.start, firstNonblank(textarea.value, state.cursor));
      const at = key === "o" ? bounds.end : bounds.start;
      const inserted = key === "o" ? "\n" + indentation : indentation + "\n";
      checkpoint();
      textarea.setRangeText(inserted, at, at, "start");
      state.cursor = key === "o" ? at + inserted.length : at + indentation.length;
      enterMode("insert");
      notifyInput();
    } else if (key === "v") enterMode("visual");
    else if (key === "V") enterMode("visual line");
    else if (key === "x") {
      if (state.cursor < bounds.end) {
        yank(state.cursor, state.cursor + 1);
        replaceRange(state.cursor, state.cursor + 1, "", state.cursor);
      }
    } else if (key === "X") {
      if (state.cursor > bounds.start) {
        yank(state.cursor - 1, state.cursor);
        replaceRange(state.cursor - 1, state.cursor, "", state.cursor - 1);
      }
    } else if (key === "D" || key === "C") {
      yank(state.cursor, bounds.end);
      replaceRange(state.cursor, bounds.end, "", state.cursor);
      if (key === "C") enterMode("insert");
    } else if (key === "Y") {
      const range = lineRange();
      yank(range.start, range.end, true);
    } else if (key === "p" || key === "P") {
      const at = state.linewise
        ? (key === "p" ? lineRange().end : bounds.start)
        : (key === "p" ? Math.min(textarea.value.length, state.cursor + 1) : state.cursor);
      replaceRange(at, at, state.register, at + Math.max(0, state.register.length - 1));
    } else if (key === "G") setCursor(Math.max(0, textarea.value.length - 1));
    else if (key === "u") restore(state.undo, state.redo);
    else return false;
    return true;
  }

  toggle.addEventListener("change", () => {
    state.enabled = toggle.checked;
    state.cursor = textarea.selectionStart;
    if (state.enabled) enterMode("normal");
    else {
      state.pending = "";
      textarea.setSelectionRange(state.cursor, state.cursor);
      updateIndicator();
    }
    textarea.focus();
  });

  textarea.addEventListener("beforeinput", () => {
    if (state.enabled && state.mode === "insert" && !state.restoring) checkpoint();
  });

  textarea.addEventListener("keydown", (event) => {
    if (!state.enabled) return;
    if (event.ctrlKey && event.key.toLowerCase() === "c" && textarea.selectionStart === textarea.selectionEnd) {
      event.preventDefault();
      event.stopImmediatePropagation();
      hideCompletionsIfPresent();
      state.cursor = textarea.selectionStart;
      enterMode("normal");
      return;
    }
    if (event.key === "Escape" || (event.ctrlKey && event.key === "[")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      hideCompletionsIfPresent();
      if (state.mode === "insert") state.cursor = Math.max(0, textarea.selectionStart - (textarea.value[textarea.selectionStart - 1] === "\n" ? 0 : 1));
      else state.cursor = textarea.selectionStart;
      enterMode("normal");
      return;
    }
    if (state.mode === "insert") return;
    if (event.key === ">" || event.key === "<") {
      event.preventDefault();
      event.stopImmediatePropagation();
      indentCommand(event.key === "<");
      return;
    }
    state.cursor = state.mode.startsWith("visual")
      ? (textarea.selectionDirection === "backward" ? textarea.selectionStart : Math.max(textarea.selectionStart, textarea.selectionEnd - 1))
      : textarea.selectionStart;
    const handled = state.mode.startsWith("visual")
      ? (move(event.key) || visualCommand(event.key))
      : normalCommand(event);
    if (handled || (!event.ctrlKey && !event.altKey && !event.metaKey && event.key.length === 1)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  textarea.addEventListener("pointerup", () => {
    if (!state.enabled) return;
    state.cursor = textarea.selectionStart;
    if (!state.mode.startsWith("visual")) textarea.setSelectionRange(state.cursor, state.cursor);
  });

  function hideCompletionsIfPresent() {
    document.querySelector("#completion-menu")?.setAttribute("hidden", "");
  }

  updateIndicator();
  return state;
}
