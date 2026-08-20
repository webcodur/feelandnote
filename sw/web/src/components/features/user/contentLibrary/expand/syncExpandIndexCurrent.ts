interface ExpandIndexCurrentElement {
  getAttribute(name: string): string | null;
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
}

interface SyncExpandIndexCurrentParams {
  elements: readonly (ExpandIndexCurrentElement | null)[];
  previousSelectedIndex: number | null;
  selectedIndex: number;
  structureChanged: boolean;
}

export function syncExpandIndexCurrent({
  elements,
  previousSelectedIndex,
  selectedIndex,
  structureChanged,
}: SyncExpandIndexCurrentParams) {
  if (structureChanged) {
    for (const element of elements) element?.removeAttribute("aria-current");
  } else if (previousSelectedIndex !== null && previousSelectedIndex !== selectedIndex) {
    elements[previousSelectedIndex]?.removeAttribute("aria-current");
  }

  const selectedItem = elements[selectedIndex];
  if (selectedItem?.getAttribute("aria-current") !== "true") {
    selectedItem?.setAttribute("aria-current", "true");
  }
}
