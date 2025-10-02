/** @type {import('prettier').Config} */
const config = {
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 80,
  endOfLine: "lf",
  plugins: ["prettier-plugin-tailwindcss"],
}

export default config