// Spicetify v3 theme entry. Loads hazy.js as a classic script so it keeps
// running outside ES module strict mode.
export function load() {
  const script = document.createElement("script");
  script.src = new URL("./hazy.js", import.meta.url).href;
  document.head.appendChild(script);
  return () => script.remove();
}
