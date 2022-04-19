/*
  For representing a token
*/

class Token {
  constructor(text, type, start, end, breakStart, breakEnd) {
    this.text = text;
    this.type = type;

    // Start and end store the length of the surroundings
    this.start = start || 0;
    this.end = end || 0;
    this.breakStart = breakStart || "";
    this.breakEnd = breakEnd || "";
  }

  append(txt) {
    this.text += txt;
  }

  display() {
    console.log(
      `${this.type || "plaintext"}: ${this.text}`
    );
  }
}