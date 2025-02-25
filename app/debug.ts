'use client';

export function logStyles(element: HTMLElement | null, elementId: string) {
  if (!element) {
    console.warn(`Element ${elementId} not found`);
    return;
  }

  const computedStyle = window.getComputedStyle(element);
  console.log(`${elementId} computed styles:`, {
    backgroundColor: computedStyle.backgroundColor,
    color: computedStyle.color,
    padding: computedStyle.padding,
    margin: computedStyle.margin,
    display: computedStyle.display,
    className: element.className,
  });
}

export function logStylesheets() {
  const styleSheets = document.styleSheets;
  try {
    console.log('Loaded stylesheets:', Array.from(styleSheets).map(sheet => ({
      href: sheet.href,
      rules: sheet.cssRules?.length || 0,
    })));
  } catch (error) {
    console.error('Error accessing stylesheets:', error);
  }
}
