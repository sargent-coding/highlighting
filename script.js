/*
  Syntax highlighting library
  Designed + developed with ⚡ by Curlpipe
*/


var dictionary;
async function dict() {
  let aff = await fetch(`https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en-GB/index.aff`)
    .then(response => response.text());
  let words = await fetch(`https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en-GB/index.dic`)
    .then(response => response.text());
  dictionary = new Typo("en_GB", aff, words);
  updateHL();
}

dict();

/*
  Highlighter is a class that will be used to highlight code.
  They will store highlighting rules for a certain syntax.

  There will be exactly one highlighter instance per language.
  These highlighters are only to be instantiated through the helper functions below.
  
  Never instantiate all language highlighters on start up.
  A highlighter is only instantiated when a certain file is detected.
  E.g. a JS highlighter is only instantiated when a .js file is opened.

  There is also a mechanism for applying spell checking should that be a requirement.

  Tokens are parts of the code that are to be highlighted.
  E.g. string tokens are green, keywords like `return` are orange.
  There are keyword tokens, which are constant, like `return` or `while`
  There are bounded tokens, which start and end with a particular sequence of characters.
  E.g. strings start with " and end with ", 
  or multiline comments starting with /* and end with */
class Highlighter {

  /*
    Initialise this highlighter
  */
  constructor(spellcheckTokens) {
    // Keys are actual keywords, value is the token type
    this.keywords = {};
    // Keys are start characters, value is the bounded token
    this.bounded = {};
    // Keys are token types, values are the regex used to find them
    this.regex = {};
    // Token names to spellcheck
    this.spellcheckTokens = spellcheckTokens || [];
  }

  /*
    Add a single keyword token to this highlighter.
    keyword - a string containing the keyword that you wish to highlight
    token - the type of token to be used e.g. `loop_keywords`
  */
  addKeyword(keyword, token) {
    this.keywords[keyword] = token;
  }

  /*
    Add multiple keyword tokens to this highlighter.
    Saves having to use the `addKeyword` method mulitple times
    keywords - an array of strings containing the keywords that you wish to highlight
    token - the type of token to be used e.g. `loop_keywords`
  */
  addKeywords(keywords, token) {
    keywords.forEach(i => this.addKeyword(i, token));
  }

  /*
    Add bounded tokens to this highlighter.

    escaping will be useful for situations in strings like this:
    "here is a quote character: \", it's escaped and doesn't mess anything up"

    start - what the bounded token starts with
    end - what the bounded token ends with
    token - the type of token to be used e.g. `loop_keywords`
    escape - a boolean, when true, you can escape the end token
  */
  addBounded(start, end, token, escape, breakStart, breakEnd) {
    let bounded = new Bounded(start, end, token, escape);
    if (breakStart !== null && breakEnd !== null) 
      bounded.addBreak(breakStart, breakEnd);
    this.bounded[start] = bounded;
  }

  /*
    A third token type to detect tokens through regex
    This should be used sparingly as it can be quite inefficient
  */
  addRegex(regex, token) {
    this.regex[token] = regex;
  }
  
  /*
    A utility function to find token matches at the current state of the highlighter
    Returns true if a token is matched and added, otherwise false
  */
  findMatch() {
    // Find any tokens that match the first letter
    let found = false;
    let kwKeys = Object.keys(this.keywords);
    let bnKeys = Object.keys(this.bounded);
    // Iterate through each keyword, seeing if it matches up
    for (let i = 0; !found && i < kwKeys.length; i++) {
      let k = kwKeys[i];
      let peek = this.chars.slice(this.ptr, this.ptr + k.length).join("");
      // If keywords match up, and there is a hard boundary ending the keyword, add it to result and skip it
      if (peek === k && !isAlpha(this.chars[this.ptr + k.length]) && !isAlpha(this.chars[this.ptr - 1])) {
        found = true;
        this.ptr += k.length - 1;
        this.result.push(new Token(k, this.keywords[k], 0, 0));
      }
    }
    // Iterate through each bounded token, seeing if it matches up
    for (let i = 0; !found && i < bnKeys.length; i++) {
      let k = bnKeys[i];
      let peek = this.chars.slice(this.ptr, this.ptr + k.length).join("");
      // If start char sequence matches up, consume and add it to result
      if (peek === k) {
        found = true;
        this.ptr += k.length;
        // Consume
        let hitEndSeq = false;
        let broken = false;
        let text = k;
        let end = this.bounded[k].end;
        let escape = this.bounded[k].escape;
        let t = this.bounded[k];
        for (; !hitEndSeq && this.ptr < this.chars.length; this.ptr++) {
          // Check for end token
          let peek = this.chars.slice(this.ptr, this.ptr + end.length).join("");
          let isEscaped = this.chars[this.ptr - 1] === "\\" && this.chars[this.ptr - 2] !== "\\";
          if (peek === end && !(escape && isEscaped)) {
            this.ptr += end.length - 1;
            text += end;
            break;
          }
          // Check for break token
          if (t.breakStart != null && t.breakEnd != null) {
            let peekBreak = this.chars.slice(this.ptr, this.ptr + t.breakStart.length).join("");
            if (peekBreak === t.breakStart && this.chars[this.ptr - 1] !== "\\") {
              // Break out! (it's recursion time)
              text += t.breakStart;
              this.ptr += t.breakStart.length;
              let tok = this.bounded[k];
              this.result.push(new Token(text, tok.token, broken ? tok.breakEnd.length : tok.end.length, t.breakStart.length));
              text = "";
              // Consume up until break end
              let level = 1;
              for (; this.ptr < this.chars.length; this.ptr++) {
                let peekBreakStart = this.chars.slice(this.ptr, this.ptr + t.breakStart.length).join("");
                if (peekBreakStart === t.breakStart && this.chars[this.ptr - 1] !== "\\") {
                  level++;
                }
                let peekBreakEnd = this.chars.slice(this.ptr, this.ptr + t.breakEnd.length).join("");
                if (peekBreakEnd === t.breakEnd) {
                  if (level === 1) {
                    break;
                  } else {
                    level--;
                  }
                }
                let c = this.chars[this.ptr];
                text += c;
              }
              // Save state so it can be restored after recursion
              let saveState = [this.ptr, this.chars, this.result];
              // Recurse
              let recurse = this.run(text, true);
              // Restore
              this.ptr = saveState[0];
              this.chars = saveState[1];
              this.result = saveState[2].concat(recurse);
              broken = true;
              text = "";
            }
          }
          // Consume
          let c = this.chars[this.ptr];
          text += c;
        }
        let tok = this.bounded[k];
        this.result.push(new Token(text, tok.token, broken ? tok.breakEnd.length : tok.start.length, tok.end.length));
      }
    }
    return found;
  }

  /*
    Apply regex token post-processing
  */
  postProcessRegex() {
    // Go through all the tokens that are plaintext
    for (let i = 0; i < this.result.length; i++) {
      let token = this.result[i];
      if (token.type !== null) continue;
      // Within the plaintext tokens, search for any regex matches
      let keys = Object.keys(this.regex);
      let hits = {};
      keys.forEach(k => {
        let tokenType = k;
        let regex = this.regex[k];
        [...token.text.matchAll(regex)].forEach(m => {
          m.index += m[0].split(m[m.length - 1])[0].length;
          let tokenStart = m.index;
          let tokenLen = m[m.length - 1].length;
          if (!(tokenStart in hits))
            hits[tokenStart] = [tokenStart, tokenLen, tokenType];
        });
      });
      // Used the information from the regex searching to form a new set of tokens
      if (Object.keys(hits).length !== 0) {
        let reformed = [];
        for (let j = 0; j < token.text.length; j++) {
          if (j in hits) {
            let start = hits[j][0];
            let len = hits[j][1];
            reformed.push(new Token(token.text.substr(start, len), hits[j][2]));
            j += len - 1;
          } else {
            let isEmpty = reformed.length == 0;
            if (isEmpty || reformed[reformed.length - 1].type !== null) {
              reformed.push(new Token("", null));
            }
            let c = token.text.charAt(j);
            reformed[reformed.length - 1].append(c);
          }
        }
        // Splice it into the result and continue
        spliceReplaceArray(reformed, this.result, i);
        i += reformed.length - 1;
      }
    }
  }

  /*
    Apply spellchecking post-processing
  */
  postProcessSpelling() {
    if (this.spellcheckTokens === []) return;
    // Go through elements that are plaintext & strings & comments
    for (let i = 0; i < this.result.length; i++) {
      let token = this.result[i];
      if (this.spellcheckTokens.indexOf(token.type) < 0) continue;
      // Perform spell check on these tokens
      let reformed = [new Token(token.text.substr(0, token.start), token.type)];
      let ptr = token.start;
      let word = "";
      while (ptr <= token.text.length) {
        let c = token.text.charAt(ptr);
        if ([" ", "\t", "\n", "\r"].indexOf(c) >= 0 || ptr == token.text.length - token.end) {
          // Deal with word
          if (word.length > 0) {
            // Word here, check in dictionary
            if (dictionary && !dictionary.check(bareWord(word))) {
              // Isn't part of dictionary, error time
              reformed.push(new Token(word, token.type + " error"));
            } else {
              reformed.push(new Token(word, token.type));
            }
          }
          word = "";
          let isEmpty = reformed.length == 0;
          if (isEmpty || reformed[reformed.length - 1].type !== null) {
            reformed.push(new Token("", token.type));
          }
          reformed[reformed.length - 1].append(c);
        } else {
          word += c;
        }
        ptr++;
      }
      // Deal with end token
      reformed.push(new Token(word, token.type));
      spliceReplaceArray(reformed, this.result, i);
      i += reformed.length - 1;
    }
  }
  
  /*
    Run the highlighting process on the code provided
    This forms a representation made up of token enums
    code - the code to be highlighted in string format
  */
  run(code, recurse) {
    // Start from the beginning of the code
    this.ptr = 0;
    this.result = [];
    // Split up chars for processing
    this.chars = code.split('');
    // Iterate through each character
    for (this.ptr = 0; this.ptr < this.chars.length; this.ptr++) {
      // Call find match to see if it can match a token, otherwise, just add to the result
      if (!this.findMatch()) {
        // Match not found, add to text
        if (this.result.length === 0 || this.result[this.result.length - 1].type !== null) {
          this.result.push(new Token("", null));
        }
        let c = this.chars[this.ptr];
        this.result[this.result.length - 1].append(c);
      }
    }
    // Apply regex tokens
    this.postProcessRegex();
    // Apply spellchecking
    if (!recurse) this.postProcessSpelling();

    return this.result;
  }

  /*
    Export the code provided in parameters into a series of HTML span tags.
    code - the code to be highlighted in string format
  */
  exportHTML(code) {
    let result = "";
    let tokens = this.run(code, false);
    tokens.forEach(i => {
      result += `<span class="${i.type || ""}">${escapeHtml(i.text)}</span>`;
    });
    return result;
  }
  
}

// Constants to hold a highlighter that can be globally accessed
// const JS = null;
// const MARKDOWN = null;

// A function that returns a javascript highlighter
// See the Highlighter class above for more details
function javascript() {
  // Set up a highlighter (spellcheck strings and comments)
  let highlighter = new Highlighter(["string", "comment"]);
  // Use javascript keywords
  highlighter.addKeywords([
    "async", "await", "break", "case", "catch", "class", "const", "continue", 
    "debugger", "default", "delete", "do", "else", "enum", "export", "extends", 
    "finally", "for", "function", "if", "implements", "import", "in", 
    "instanceof", "interface", "let", "new", "null", "package", "private", 
    "protected", "public", "return", "super", "switch", "static", "this", 
    "throw", "try", "typeof", "var", "void", "while", "with", "yield"], "keyword");
  // Booleans
  highlighter.addKeywords(["true", "false"], "booleans");
  // Functions
  highlighter.addRegex(/([a-zA-Z][a-zA-Z0-9]*)\(/g, "function");
  // Attributes
  highlighter.addRegex(/\.([a-zA-Z][a-zA-Z0-9]*)/g, "attribute");
  // JS digits (janky as fuck)
  highlighter.addKeywords(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], "digit");
  // Implement strings (start with ", end with ")
  highlighter.addBounded("\"", "\"", "string", true);
  highlighter.addBounded("'", "'", "string", true);
  highlighter.addBounded("`", "`", "string", true, "${", "}");
  // Implement single line comments (start with //, end with newline)
  highlighter.addBounded("//", "\n", "comment", false);
  // Implement multi line comments (start with /*, end with */)
  highlighter.addBounded("/*", "*/", "comment", false);
  // Regex
  highlighter.addBounded("/", "/", "regex", true);
  // Return highlighter
  return highlighter;
}


// A function that returns a markdown highlighter
// See the Highlighter class above for more details
function markdown() {
  let highlighter = new Highlighter();
  // Implement headings (start with #, end with newline)
  highlighter.addBounded("#", "\n", "heading");
  // Implement italic (start with *, end with *)
  highlighter.addBounded("***", "***", "bolditalic");
  highlighter.addBounded("**", "**", "bold");
  highlighter.addBounded("*", "*", "italic");
  // Links
  highlighter.addBounded("[", "]", "name");
  highlighter.addBounded("(", ")", "url");
  // Tables
  highlighter.addBounded("|", "|\n", "table");
  // Return highlighter
  return highlighter;
}

// Testing stuff
const JS = javascript();

const textarea = document.getElementsByTagName("textarea")[0];
const hlLayer = document.getElementById("hl-layer");

// Update highlighting when user edits the textarea
function updateHL() {
  const code = textarea.value;
  const h = JS.exportHTML(code);
  console.log(h);
  hlLayer.innerHTML = h;
}

function syncScroll() {
  byId('hl-layer').scrollTop = byId('editor').scrollTop = this.scrollTop; 
  byId('hl-layer').scrollLeft = byId('editor').scrollLeft = this.scrollLeft;
}

textarea.addEventListener("input", updateHL);
textarea.addEventListener("scroll", syncScroll);
updateHL();