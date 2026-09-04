function selectionOffset(element, node, offset) {
  const range = document.createRange();
  range.selectNodeContents(element);
  try {
    range.setEnd(node, offset);
    return range.toString().length;
  } catch {
    return 0;
  }
}

function textPosition(element, requestedOffset) {
  const offset = Math.max(0, requestedOffset);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let traversed = 0;
  let node = walker.nextNode();
  while (node) {
    const next = traversed + node.data.length;
    if (offset <= next) return { node, offset: offset - traversed };
    traversed = next;
    node = walker.nextNode();
  }
  if (!element.lastChild || element.lastChild.nodeType !== Node.TEXT_NODE) {
    element.append(document.createTextNode(""));
  }
  return { node: element.lastChild, offset: element.lastChild.textContent.length };
}

/** Give a plaintext contenteditable the familiar textarea editing API. */
export function attachTextEditor(element) {
  let direction = "none";

  Object.defineProperties(element, {
    value: {
      get() {
        return element.textContent ?? "";
      },
      set(value) {
        element.replaceChildren(document.createTextNode(String(value)));
      },
    },
    selectionStart: {
      get() {
        const selection = window.getSelection();
        if (!selection?.rangeCount || !element.contains(selection.anchorNode)) return 0;
        const range = selection.getRangeAt(0);
        return Math.min(
          selectionOffset(element, range.startContainer, range.startOffset),
          selectionOffset(element, range.endContainer, range.endOffset),
        );
      },
    },
    selectionEnd: {
      get() {
        const selection = window.getSelection();
        if (!selection?.rangeCount || !element.contains(selection.anchorNode)) return 0;
        const range = selection.getRangeAt(0);
        return Math.max(
          selectionOffset(element, range.startContainer, range.startOffset),
          selectionOffset(element, range.endContainer, range.endOffset),
        );
      },
    },
    selectionDirection: {
      get() {
        const selection = window.getSelection();
        if (selection?.rangeCount && element.contains(selection.anchorNode) && element.contains(selection.focusNode)) {
          const anchor = selectionOffset(element, selection.anchorNode, selection.anchorOffset);
          const focus = selectionOffset(element, selection.focusNode, selection.focusOffset);
          if (anchor < focus) return "forward";
          if (anchor > focus) return "backward";
        }
        return direction;
      },
    },
  });

  element.setSelectionRange = (start, end = start, nextDirection = "none") => {
    const selection = window.getSelection();
    const startPosition = textPosition(element, start);
    const endPosition = textPosition(element, end);
    direction = nextDirection;
    if (nextDirection === "backward" && selection.setBaseAndExtent) {
      selection.setBaseAndExtent(endPosition.node, endPosition.offset, startPosition.node, startPosition.offset);
      return;
    }
    const range = document.createRange();
    range.setStart(startPosition.node, startPosition.offset);
    range.setEnd(endPosition.node, endPosition.offset);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  element.setRangeText = (replacement, start, end, selectionMode = "preserve") => {
    const previousStart = element.selectionStart;
    const previousEnd = element.selectionEnd;
    const text = String(replacement);
    element.dispatchEvent(new InputEvent("beforeinput", {
      bubbles: true,
      inputType: "insertReplacementText",
      data: text,
    }));
    element.value = element.value.slice(0, start) + text + element.value.slice(end);
    if (selectionMode === "select") element.setSelectionRange(start, start + text.length);
    else if (selectionMode === "start") element.setSelectionRange(start, start);
    else if (selectionMode === "end") element.setSelectionRange(start + text.length, start + text.length);
    else {
      const change = text.length - (end - start);
      element.setSelectionRange(
        previousStart > end ? previousStart + change : previousStart,
        previousEnd > end ? previousEnd + change : previousEnd,
      );
    }
  };

  element.addEventListener("beforeinput", (event) => {
    if (!["insertParagraph", "insertLineBreak"].includes(event.inputType)) return;
    event.preventDefault();
    const start = element.selectionStart;
    const end = element.selectionEnd;
    element.setRangeText("\n", start, end, "end");
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "\n" }));
  });

  element.addEventListener("keydown", (event) => {
    const primaryModifier = event.metaKey || event.ctrlKey;
    if (primaryModifier && !event.altKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      element.setSelectionRange(0, element.value.length);
      return;
    }
    if (!["Backspace", "Delete"].includes(event.key) || element.selectionStart === element.selectionEnd) return;
    event.preventDefault();
    element.setRangeText("", element.selectionStart, element.selectionEnd, "end");
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: event.key === "Backspace" ? "deleteContentBackward" : "deleteContentForward",
    }));
  });

  element.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") ?? "";
    element.setRangeText(text, element.selectionStart, element.selectionEnd, "end");
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: text }));
  });

  return element;
}
