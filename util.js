function isAlpha(str) {
  if (str == null) return false;
  let code = str.charCodeAt(0);
  return code > 64 && code < 91 || code > 96 && code < 123;
}

function escapeHtml(unsafe) {
  return unsafe
   .replace(/&/g, "&amp;")
   .replace(/</g, "&lt;")
   .replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;")
   .replace(/'/g, "&#039;")
   .replace(/ /g, "&nbsp;")
   .replace(/\n/g, "<br>");
}

function spliceReplaceArray(from, to, idx) {
  to.splice(idx, 1);
  for (let n = 0; n < from.length; n++) {
    to.splice(idx + n, 0, from[n]);
  }
}

// Regex to remove punctuation from words
const leading = /^(\p{P}+)/gimu;
const trailing = /(\p{P}+)$/gimu;
const digit = /\d+/gimu;
const ordinal = /0(st|nd|rd|th)/gimu;
const url1 = /(^(https?):\/\/(\w+\.)+\w*(\/\w*)*(\?.*)?)/;
const url2 = /(^\/?\/?(\w+\.)+\w*(\/\w*)*(\?.*)?)/;
const at = /@[a-zA-Z0-9]+/gimu;

// Function to strip away punctuation from a word to be spellchecked
const bareWord = (word) => {
  return word.replaceAll("\"", "")
    .replace(at, "")
    .replace(url1, "")
    .replace(url2, "")
    .replace(digit, "0")
    .replace(ordinal, "")
    .replace(leading, "")
    .replace(trailing, "");
}