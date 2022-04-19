/*
  For representing a bounded token
*/

class Bounded {
  constructor(start, end, token, escape) {
    this.start = start;
    this.end = end;
    this.token = token;
    this.escape = escape;
  }

  /*
    A break is a temporary pause in highlighting within an element
    This is good for string interpolation
    The start and end of this break MUST NOT be the same as the 
    start and end chars of the token
  */
  addBreak(start, end) {
    if (start !== this.start && start !== this.end) {
      this.breakStart = start;
    }
    if (end !== this.start && end !== this.end) {
      this.breakEnd = end;
    }
  }
}

// The inner bounded token equivalent
class InBounded {
  constructor(start, end, token) {
    this.start = start;
    this.end = end;
    this.token = token;
  }
}